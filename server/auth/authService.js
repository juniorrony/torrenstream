import TokenManager from '../utils/tokenManager.js';
import PasswordUtils from '../utils/passwordUtils.js';
import crypto from 'crypto';

class AuthService {
  constructor(database) {
    this.db = database;
  }

  // User registration
  async register(registrationData) {
    const { username, email, password, confirmPassword } = registrationData;

    try {
      // Validate input
      const validation = await this.validateRegistration({
        username, email, password, confirmPassword
      });

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          code: 'VALIDATION_ERROR'
        };
      }

      // Check if user already exists
      const existingUser = await this.checkUserExists(username, email);
      if (existingUser.exists) {
        return {
          success: false,
          errors: [existingUser.reason],
          code: 'USER_EXISTS'
        };
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = TokenManager.generateEmailVerificationToken();

      // Create user
      const userData = {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: 'user',
        // Auto-verify in development mode since no email service is configured
        status: process.env.NODE_ENV === 'development' ? 'active' : 'pending',
        emailVerified: process.env.NODE_ENV === 'development' ? true : false,
        emailVerificationToken: process.env.NODE_ENV === 'development' ? null : emailVerificationToken
      };

      const result = await this.db.createUser(userData);

      // Create user profile
      await this.db.createUserProfile(result.id, {
        displayName: username.trim(),
        preferences: {
          theme: 'dark',
          autoplay: false,
          defaultQuality: 'auto',
          notifications: true
        }
      });

      // Log registration
      await this.db.logAction({
        userId: result.id,
        action: 'user_registered',
        resourceType: 'user',
        resourceId: result.id.toString(),
        details: {
          username: userData.username,
          email: userData.email,
          registrationMethod: 'email'
        }
      });

      return {
        success: true,
        user: {
          id: result.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          emailVerified: userData.emailVerified
        },
        emailVerificationToken,
        message: 'User registered successfully. Please verify your email address.'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during registration'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // User login
  async login(credentials, clientInfo = {}) {
    const { identifier, password } = credentials;
    const { ipAddress, userAgent } = clientInfo;

    try {
      // Validate input
      if (!identifier || !password) {
        return {
          success: false,
          errors: ['Email/username and password are required'],
          code: 'MISSING_CREDENTIALS'
        };
      }

      // Find user by email or username
      let user = null;
      if (identifier.includes('@')) {
        user = await this.db.getUserByEmail(identifier.trim().toLowerCase());
      } else {
        user = await this.db.getUserByUsername(identifier.trim().toLowerCase());
      }

      if (!user) {
        return {
          success: false,
          errors: ['Invalid credentials'],
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Verify password
      const passwordValid = await PasswordUtils.verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        // Log failed login attempt
        await this.db.logAction({
          userId: user.id,
          action: 'login_failed',
          resourceType: 'user',
          resourceId: user.id.toString(),
          details: {
            reason: 'invalid_password',
            identifier
          },
          ipAddress,
          userAgent
        });

        return {
          success: false,
          errors: ['Invalid credentials'],
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Check user status
      if (user.status === 'banned') {
        return {
          success: false,
          errors: ['Account has been banned'],
          code: 'ACCOUNT_BANNED'
        };
      }

      if (user.status === 'suspended') {
        return {
          success: false,
          errors: ['Account is temporarily suspended'],
          code: 'ACCOUNT_SUSPENDED'
        };
      }

      // Generate tokens
      const tokens = TokenManager.generateTokenPair(user);

      // Store session in database
      const sessionData = {
        userId: user.id,
        sessionToken: TokenManager.generateSessionToken(),
        refreshToken: tokens.refreshToken,
        ipAddress,
        userAgent,
        expiresAt: tokens.refreshTokenExpires.toISOString()
      };

      await this.db.createSession(sessionData);

      // Update user's last login
      await this.db.updateUser(user.id, {
        last_login: new Date().toISOString()
      });

      // Log successful login
      await this.db.logAction({
        userId: user.id,
        action: 'login_success',
        resourceType: 'user',
        resourceId: user.id.toString(),
        details: {
          loginMethod: identifier.includes('@') ? 'email' : 'username'
        },
        ipAddress,
        userAgent
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.email_verified,
          displayName: user.display_name,
          avatarUrl: user.avatar_url
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        },
        sessionToken: sessionData.sessionToken
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during login'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Refresh access token
  async refreshToken(refreshToken, clientInfo = {}) {
    try {
      // Verify refresh token
      const verification = TokenManager.verifyRefreshToken(refreshToken);
      if (!verification.valid) {
        return {
          success: false,
          errors: ['Invalid or expired refresh token'],
          code: 'INVALID_REFRESH_TOKEN'
        };
      }

      // Get session from database
      const session = await this.db.getSessionByToken(refreshToken);
      if (!session) {
        return {
          success: false,
          errors: ['Session not found or expired'],
          code: 'SESSION_NOT_FOUND'
        };
      }

      // Get user data
      const user = await this.db.getUserById(session.user_id);
      if (!user || user.status === 'banned' || user.status === 'suspended') {
        return {
          success: false,
          errors: ['User account is not active'],
          code: 'ACCOUNT_INACTIVE'
        };
      }

      // Generate new access token
      const newAccessToken = TokenManager.generateAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      });

      // Log token refresh
      await this.db.logAction({
        userId: user.id,
        action: 'token_refreshed',
        resourceType: 'session',
        resourceId: session.id.toString(),
        details: {
          sessionId: session.id
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn: TokenManager.parseExpiration(process.env.JWT_EXPIRES_IN || '15m') / 1000
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during token refresh'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Logout user
  async logout(sessionToken, userId, clientInfo = {}) {
    try {
      if (sessionToken) {
        // Delete session from database
        await this.db.deleteSession(sessionToken);
      }

      // Log logout
      if (userId) {
        await this.db.logAction({
          userId,
          action: 'logout',
          resourceType: 'session',
          details: {
            logoutMethod: sessionToken ? 'session_token' : 'manual'
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during logout'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Email verification
  async verifyEmail(token) {
    try {
      if (!token) {
        return {
          success: false,
          errors: ['Verification token is required'],
          code: 'MISSING_TOKEN'
        };
      }

      // Find user by verification token
      const users = await this.db.getAllUsers();
      const user = users.find(u => u.email_verification_token === token);

      if (!user) {
        return {
          success: false,
          errors: ['Invalid or expired verification token'],
          code: 'INVALID_TOKEN'
        };
      }

      if (user.email_verified) {
        return {
          success: false,
          errors: ['Email is already verified'],
          code: 'ALREADY_VERIFIED'
        };
      }

      // Update user
      await this.db.updateUser(user.id, {
        email_verified: true,
        email_verification_token: null,
        status: 'active'
      });

      // Log email verification
      await this.db.logAction({
        userId: user.id,
        action: 'email_verified',
        resourceType: 'user',
        resourceId: user.id.toString(),
        details: {
          email: user.email
        }
      });

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during email verification'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Request password reset
  async requestPasswordReset(email) {
    try {
      const user = await this.db.getUserByEmail(email.trim().toLowerCase());
      
      // Always return success to prevent email enumeration
      const response = {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      };

      if (!user) {
        return response;
      }

      // Generate password reset token
      const resetToken = TokenManager.generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await this.db.updateUser(user.id, {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString()
      });

      // Log password reset request
      await this.db.logAction({
        userId: user.id,
        action: 'password_reset_requested',
        resourceType: 'user',
        resourceId: user.id.toString(),
        details: {
          email: user.email
        }
      });

      return {
        ...response,
        resetToken // Include for development/testing - remove in production
      };

    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        return {
          success: false,
          errors: ['Reset token and new password are required'],
          code: 'MISSING_DATA'
        };
      }

      // Validate new password
      const passwordValidation = PasswordUtils.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          errors: passwordValidation.errors,
          code: 'INVALID_PASSWORD'
        };
      }

      // Find user by reset token
      const users = await this.db.getAllUsers();
      const user = users.find(u => 
        u.password_reset_token === token && 
        u.password_reset_expires && 
        new Date(u.password_reset_expires) > new Date()
      );

      if (!user) {
        return {
          success: false,
          errors: ['Invalid or expired reset token'],
          code: 'INVALID_TOKEN'
        };
      }

      // Hash new password
      const passwordHash = await PasswordUtils.hashPassword(newPassword);

      // Update user
      await this.db.updateUser(user.id, {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null
      });

      // Log password reset
      await this.db.logAction({
        userId: user.id,
        action: 'password_reset_completed',
        resourceType: 'user',
        resourceId: user.id.toString(),
        details: {
          email: user.email
        }
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during password reset'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Change password (for logged-in users)
  async changePassword(userId, currentPassword, newPassword, confirmPassword) {
    try {
      // Validate input
      const validation = PasswordUtils.validatePasswordChange(
        currentPassword, newPassword, confirmPassword
      );

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          code: 'VALIDATION_ERROR'
        };
      }

      // Get user
      const user = await this.db.getUserById(userId);
      if (!user) {
        return {
          success: false,
          errors: ['User not found'],
          code: 'USER_NOT_FOUND'
        };
      }

      // Verify current password
      const currentPasswordValid = await PasswordUtils.verifyPassword(
        currentPassword, user.password_hash
      );

      if (!currentPasswordValid) {
        return {
          success: false,
          errors: ['Current password is incorrect'],
          code: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // Hash new password
      const passwordHash = await PasswordUtils.hashPassword(newPassword);

      // Update user
      await this.db.updateUser(userId, {
        password_hash: passwordHash
      });

      // Log password change
      await this.db.logAction({
        userId,
        action: 'password_changed',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          changeMethod: 'user_initiated'
        }
      });

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred during password change'],
        code: 'INTERNAL_ERROR'
      };
    }
  }

  // Validate registration data
  async validateRegistration(data) {
    const { username, email, password, confirmPassword } = data;
    const errors = [];

    // Username validation
    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    } else if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (username.length > 50) {
      errors.push('Username must be less than 50 characters long');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Email validation
    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    } else if (!confirmPassword) {
      errors.push('Password confirmation is required');
    } else if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    } else {
      const passwordValidation = PasswordUtils.validatePassword(password);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Check if user exists
  async checkUserExists(username, email) {
    try {
      const existingEmail = await this.db.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return {
          exists: true,
          reason: 'An account with this email already exists'
        };
      }

      const existingUsername = await this.db.getUserByUsername(username.trim().toLowerCase());
      if (existingUsername) {
        return {
          exists: true,
          reason: 'Username is already taken'
        };
      }

      return {
        exists: false,
        reason: null
      };
    } catch (error) {
      throw new Error('Error checking user existence');
    }
  }

  // Get user by session token
  async getUserBySessionToken(sessionToken) {
    try {
      const session = await this.db.getSessionByToken(sessionToken);
      if (!session) {
        return null;
      }

      const user = await this.db.getUserById(session.user_id);
      return user;
    } catch (error) {
      console.error('Error getting user by session token:', error);
      return null;
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      await this.db.deleteExpiredSessions();
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }
}

export default AuthService;