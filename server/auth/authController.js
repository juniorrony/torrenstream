import AuthService from './authService.js';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';

class AuthController {
  constructor(database) {
    this.authService = new AuthService(database);
    this.db = database;

    // Rate limiting configurations
    this.loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'Too many login attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    });

    this.registerLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per hour per IP
      message: {
        error: 'Too many registration attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });

    this.passwordResetLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 password reset requests per hour
      message: {
        error: 'Too many password reset attempts, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });

    // Configure multer for avatar uploads
    this.avatarStorage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
        await fs.ensureDir(uploadDir);
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
      }
    });

    this.avatarUpload = multer({
      storage: this.avatarStorage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
  }

  // Validation rules
  getValidationRules() {
    return {
      register: [
        body('username')
          .isLength({ min: 3, max: 50 })
          .matches(/^[a-zA-Z0-9_-]+$/)
          .withMessage('Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens'),
        body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Please enter a valid email address'),
        body('password')
          .isLength({ min: 8 })
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
          .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
        body('confirmPassword')
          .custom((value, { req }) => {
            if (value !== req.body.password) {
              throw new Error('Passwords do not match');
            }
            return true;
          })
      ],
      login: [
        body('identifier')
          .notEmpty()
          .withMessage('Email or username is required'),
        body('password')
          .notEmpty()
          .withMessage('Password is required')
      ],
      forgotPassword: [
        body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Please enter a valid email address')
      ],
      resetPassword: [
        body('token')
          .notEmpty()
          .withMessage('Reset token is required'),
        body('password')
          .isLength({ min: 8 })
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
          .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character')
      ],
      changePassword: [
        body('currentPassword')
          .notEmpty()
          .withMessage('Current password is required'),
        body('newPassword')
          .isLength({ min: 8 })
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
          .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
        body('confirmPassword')
          .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
              throw new Error('New passwords do not match');
            }
            return true;
          })
      ]
    };
  }

  // Handle validation errors
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg
        }))
      });
    }
    next();
  }

  // Get client info from request
  getClientInfo(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };
  }

  // User registration endpoint
  register = async (req, res) => {
    try {
      const { username, email, password, confirmPassword } = req.body;
      const clientInfo = this.getClientInfo(req);

      console.log(`🔐 Registration attempt: ${username} <${email}>`);

      const result = await this.authService.register({
        username,
        email,
        password,
        confirmPassword
      });

      if (!result.success) {
        console.log(`❌ Registration failed: ${result.errors.join(', ')}`);
        return res.status(400).json({
          error: result.errors.join(', '),
          code: result.code,
          details: result.errors
        });
      }

      console.log(`✅ User registered successfully: ${result.user.username}`);

      // Remove sensitive data from response
      const { emailVerificationToken, ...safeResult } = result;

      res.status(201).json({
        success: true,
        message: result.message,
        user: result.user,
        // Include verification token in development only
        ...(process.env.NODE_ENV === 'development' && { verificationToken: emailVerificationToken })
      });

    } catch (error) {
      console.error('Registration endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during registration',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // User login endpoint
  login = async (req, res) => {
    try {
      const { identifier, password, rememberMe } = req.body;
      const clientInfo = this.getClientInfo(req);

      console.log(`🔐 Login attempt: ${identifier}`);

      const result = await this.authService.login(
        { identifier, password },
        clientInfo
      );

      if (!result.success) {
        console.log(`❌ Login failed: ${result.errors.join(', ')}`);
        return res.status(401).json({
          error: result.errors.join(', '),
          code: result.code
        });
      }

      console.log(`✅ User logged in successfully: ${result.user.username}`);

      // Set cookies for web clients
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
      };

      res.cookie('accessToken', result.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions);
      res.cookie('sessionToken', result.sessionToken, cookieOptions);

      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        tokens: result.tokens
      });

    } catch (error) {
      console.error('Login endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during login',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Token refresh endpoint
  refreshToken = async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
      const clientInfo = this.getClientInfo(req);

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      console.log('🔄 Token refresh attempt');

      const result = await this.authService.refreshToken(refreshToken, clientInfo);

      if (!result.success) {
        console.log(`❌ Token refresh failed: ${result.errors.join(', ')}`);
        
        // Clear invalid cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('sessionToken');

        return res.status(401).json({
          error: result.errors.join(', '),
          code: result.code
        });
      }

      console.log('✅ Token refreshed successfully');

      // Update access token cookie
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.json({
        success: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      });

    } catch (error) {
      console.error('Token refresh endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during token refresh',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // User logout endpoint
  logout = async (req, res) => {
    try {
      const sessionToken = req.cookies.sessionToken;
      const userId = req.user?.id;
      const clientInfo = this.getClientInfo(req);

      console.log(`🔐 Logout attempt: ${userId ? `User ${userId}` : 'Unknown user'}`);

      const result = await this.authService.logout(sessionToken, userId, clientInfo);

      // Clear all auth cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('sessionToken');

      console.log('✅ User logged out successfully');

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during logout',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Email verification endpoint
  verifyEmail = async (req, res) => {
    try {
      const { token } = req.params;

      console.log(`📧 Email verification attempt: ${token}`);

      const result = await this.authService.verifyEmail(token);

      if (!result.success) {
        console.log(`❌ Email verification failed: ${result.errors.join(', ')}`);
        return res.status(400).json({
          error: result.errors.join(', '),
          code: result.code
        });
      }

      console.log('✅ Email verified successfully');

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Email verification endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during email verification',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Forgot password endpoint
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      console.log(`🔑 Password reset request: ${email}`);

      const result = await this.authService.requestPasswordReset(email);

      if (!result.success) {
        return res.status(400).json({
          error: result.errors.join(', '),
          code: result.code
        });
      }

      console.log('✅ Password reset email sent (if user exists)');

      res.json({
        success: true,
        message: result.message,
        // Include reset token in development only
        ...(process.env.NODE_ENV === 'development' && { resetToken: result.resetToken })
      });

    } catch (error) {
      console.error('Forgot password endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Reset password endpoint
  resetPassword = async (req, res) => {
    try {
      const { token, password } = req.body;

      console.log(`🔑 Password reset attempt: ${token}`);

      const result = await this.authService.resetPassword(token, password);

      if (!result.success) {
        console.log(`❌ Password reset failed: ${result.errors.join(', ')}`);
        return res.status(400).json({
          error: result.errors.join(', '),
          code: result.code
        });
      }

      console.log('✅ Password reset successfully');

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Reset password endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during password reset',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Change password endpoint (for authenticated users)
  changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;

      console.log(`🔑 Password change attempt: User ${userId}`);

      const result = await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        confirmPassword
      );

      if (!result.success) {
        console.log(`❌ Password change failed: ${result.errors.join(', ')}`);
        return res.status(400).json({
          error: result.errors.join(', '),
          code: result.code
        });
      }

      console.log('✅ Password changed successfully');

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Change password endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred during password change',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Get current user profile
  getProfile = async (req, res) => {
    try {
      const user = req.user;

      // Get additional user data from database
      const fullUser = await this.db.getUserById(user.id);
      
      if (!fullUser) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Remove sensitive information
      const { password_hash, email_verification_token, password_reset_token, ...safeUser } = fullUser;

      res.json({
        success: true,
        user: safeUser
      });

    } catch (error) {
      console.error('Get profile endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred while fetching profile',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Check authentication status
  checkAuth = async (req, res) => {
    try {
      res.json({
        authenticated: !!req.user,
        user: req.user || null
      });
    } catch (error) {
      console.error('Check auth endpoint error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Get authentication configuration (for frontend)
  getAuthConfig = (req, res) => {
    try {
      res.json({
        passwordRequirements: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        },
        features: {
          emailVerification: true,
          passwordReset: true,
          rememberMe: true,
          socialLogin: false // For future implementation
        },
        limits: {
          usernameMinLength: 3,
          usernameMaxLength: 50,
          maxLoginAttempts: 5,
          maxRegistrationAttempts: 3
        }
      });
    } catch (error) {
      console.error('Get auth config error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Development only: List all users
  devListUsers = async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const users = await this.db.getAllUsers();
      const safeUsers = users.map(user => {
        const { password_hash, email_verification_token, password_reset_token, ...safeUser } = user;
        return safeUser;
      });

      res.json({
        success: true,
        users: safeUsers,
        count: safeUsers.length
      });
    } catch (error) {
      console.error('Dev list users error:', error);
      res.status(500).json({
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  // Upload user avatar
  uploadAvatar = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user.id;
      const avatarPath = `/uploads/avatars/${req.file.filename}`;

      // Remove old avatar if exists
      const user = await this.db.getUserById(userId);
      if (user.profile?.avatar_url) {
        const oldAvatarPath = path.join(process.cwd(), user.profile.avatar_url);
        try {
          await fs.remove(oldAvatarPath);
        } catch (error) {
          console.log('Could not remove old avatar:', error.message);
        }
      }

      // Update user profile with new avatar
      await this.db.updateUserProfile(userId, {
        avatar_url: avatarPath
      });

      // Log the action
      await this.db.logAction({
        userId,
        action: 'avatar_uploaded',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl: avatarPath
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  };

  // Delete user avatar
  deleteAvatar = async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await this.db.getUserById(userId);

      if (user.profile?.avatar_url) {
        const avatarPath = path.join(process.cwd(), user.profile.avatar_url);
        try {
          await fs.remove(avatarPath);
        } catch (error) {
          console.log('Could not remove avatar file:', error.message);
        }
      }

      // Remove avatar from user profile
      await this.db.updateUserProfile(userId, {
        avatar_url: null
      });

      // Log the action
      await this.db.logAction({
        userId,
        action: 'avatar_deleted',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {},
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Avatar removed successfully'
      });
    } catch (error) {
      console.error('Avatar deletion error:', error);
      res.status(500).json({ error: 'Failed to remove avatar' });
    }
  };

  // Update user profile
  updateProfile = async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        username,
        email,
        firstName,
        lastName,
        bio,
        location,
        website,
        timezone,
        preferences
      } = req.body;

      // Validate input
      if (username && (username.length < 3 || username.length > 50)) {
        return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
      }

      if (email && !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      if (website && website.length > 0 && !website.match(/^https?:\/\/.+/)) {
        return res.status(400).json({ error: 'Website must be a valid URL starting with http:// or https://' });
      }

      // Check if username/email already exists (excluding current user)
      if (username) {
        const existingUser = await new Promise((resolve, reject) => {
          this.db.db.get(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, userId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      if (email) {
        const existingUser = await new Promise((resolve, reject) => {
          this.db.db.get(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, userId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Email already taken' });
        }
      }

      // Update user basic info
      const userUpdates = {};
      if (username) userUpdates.username = username;
      if (email) userUpdates.email = email;

      if (Object.keys(userUpdates).length > 0) {
        await this.db.updateUser(userId, userUpdates);
      }

      // Update user profile
      const profileUpdates = {};
      if (firstName !== undefined) profileUpdates.first_name = firstName;
      if (lastName !== undefined) profileUpdates.last_name = lastName;
      if (bio !== undefined) profileUpdates.bio = bio;
      if (location !== undefined) profileUpdates.location = location;
      if (website !== undefined) profileUpdates.website = website;
      if (timezone !== undefined) profileUpdates.timezone = timezone;

      // Update preferences
      if (preferences) {
        if (preferences.theme) profileUpdates.theme = preferences.theme;
        if (preferences.language) profileUpdates.language = preferences.language;
        if (preferences.emailNotifications !== undefined) profileUpdates.email_notifications = preferences.emailNotifications;
        if (preferences.pushNotifications !== undefined) profileUpdates.push_notifications = preferences.pushNotifications;
        if (preferences.autoplay !== undefined) profileUpdates.autoplay = preferences.autoplay;
        if (preferences.defaultQuality) profileUpdates.default_quality = preferences.defaultQuality;
        if (preferences.subtitles !== undefined) profileUpdates.subtitles = preferences.subtitles;
        if (preferences.rememberProgress !== undefined) profileUpdates.remember_progress = preferences.rememberProgress;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await this.db.updateUserProfile(userId, profileUpdates);
      }

      // Log the action
      await this.db.logAction({
        userId,
        action: 'profile_updated',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          userUpdates,
          profileUpdates
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Return updated user data
      const updatedUser = await this.db.getUserById(userId);
      const userProfile = await this.db.getUserProfile(userId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...updatedUser,
          profile: userProfile
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  };
}

export default AuthController;