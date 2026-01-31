import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const MIN_PASSWORD_LENGTH = 8;

class PasswordUtils {
  // Hash password with bcrypt
  static async hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const validation = this.validatePassword(password);
    if (!validation.valid) {
      throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
    }

    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  // Verify password against hash
  static async verifyPassword(password, hash) {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Validate password strength
  static validatePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { valid: false, errors, strength: 'invalid' };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
      /^(qwerty|asdfgh|zxcvbn|password|admin|login|welcome|secret)/i
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common weak patterns');
        break;
      }
    }

    // Calculate password strength
    const strength = this.calculatePasswordStrength(password);

    return {
      valid: errors.length === 0,
      errors,
      strength
    };
  }

  // Calculate password strength score
  static calculatePasswordStrength(password) {
    if (!password) return 'invalid';

    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety bonus
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // Complexity bonus
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*\d/.test(password)) score += 1;
    if (/[A-Z].*[a-z]/.test(password)) score += 1;

    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
    if (/^(password|admin|login|welcome|secret|123456|qwerty)/i.test(password)) score -= 2;

    score = Math.max(0, score);

    if (score <= 3) return 'weak';
    if (score <= 6) return 'medium';
    if (score <= 8) return 'strong';
    return 'very-strong';
  }

  // Generate secure random password
  static generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  // Get random character from string
  static getRandomChar(str) {
    return str[crypto.randomInt(0, str.length)];
  }

  // Shuffle string characters
  static shuffleString(str) {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  // Check if password has been compromised (simple local checks)
  static isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'login', 'welcome', 'secret',
      'letmein', 'monkey', 'dragon', 'master', 'shadow',
      'football', 'baseball', 'superman', 'batman', 'hello',
      '12345', '1234', '12345678', '123123', 'password1'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  // Generate password reset token
  static generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate password hash for database storage
  static async createPasswordHash(plainPassword) {
    return await this.hashPassword(plainPassword);
  }

  // Verify user login credentials
  static async verifyCredentials(plainPassword, hashedPassword) {
    return await this.verifyPassword(plainPassword, hashedPassword);
  }

  // Generate temporary password for new users
  static generateTemporaryPassword(length = 12) {
    // Use alphanumeric only for temporary passwords
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[crypto.randomInt(0, chars.length)];
    }
    
    return result;
  }

  // Check if password needs to be updated (based on age or strength)
  static shouldUpdatePassword(user) {
    // Check if password was set more than 90 days ago
    const passwordAge = Date.now() - new Date(user.updated_at).getTime();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    
    return {
      shouldUpdate: passwordAge > maxAge,
      reason: passwordAge > maxAge ? 'Password is older than 90 days' : null,
      daysOld: Math.floor(passwordAge / (24 * 60 * 60 * 1000))
    };
  }

  // Validate password change request
  static validatePasswordChange(currentPassword, newPassword, confirmPassword) {
    const errors = [];

    if (!currentPassword) {
      errors.push('Current password is required');
    }

    if (!newPassword) {
      errors.push('New password is required');
    }

    if (!confirmPassword) {
      errors.push('Password confirmation is required');
    }

    if (newPassword !== confirmPassword) {
      errors.push('New password and confirmation do not match');
    }

    if (currentPassword === newPassword) {
      errors.push('New password must be different from current password');
    }

    // Validate new password strength
    if (newPassword) {
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get password requirements for frontend
  static getPasswordRequirements() {
    return {
      minLength: MIN_PASSWORD_LENGTH,
      maxLength: 128,
      requirements: [
        'At least 8 characters long',
        'At least one uppercase letter (A-Z)',
        'At least one lowercase letter (a-z)',
        'At least one number (0-9)',
        'At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
        'No common weak patterns'
      ],
      strengthLevels: {
        weak: 'Contains basic requirements but lacks complexity',
        medium: 'Good password with adequate security',
        strong: 'Strong password with good complexity',
        'very-strong': 'Excellent password with high security'
      }
    };
  }
}

export default PasswordUtils;