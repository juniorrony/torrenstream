import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Default JWT settings - these should be set via environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this-too';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class TokenManager {
  // Generate access token
  static generateAccessToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      status: payload.status,
      type: 'access'
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'torrentstream',
      audience: 'torrentstream-users'
    });
  }

  // Generate refresh token
  static generateRefreshToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      username: payload.username,
      type: 'refresh',
      tokenId: crypto.randomUUID() // Unique ID for token revocation
    };

    return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'torrentstream',
      audience: 'torrentstream-users'
    });
  }

  // Generate both access and refresh tokens
  static generateTokenPair(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculate expiration dates
    const accessTokenExpires = new Date(Date.now() + this.parseExpiration(JWT_EXPIRES_IN));
    const refreshTokenExpires = new Date(Date.now() + this.parseExpiration(JWT_REFRESH_EXPIRES_IN));

    return {
      accessToken,
      refreshToken,
      accessTokenExpires,
      refreshTokenExpires,
      expiresIn: this.parseExpiration(JWT_EXPIRES_IN) / 1000 // seconds
    };
  }

  // Verify access token
  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'torrentstream',
        audience: 'torrentstream-users'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        decoded,
        expired: false
      };
    } catch (error) {
      return {
        valid: false,
        decoded: null,
        expired: error.name === 'TokenExpiredError',
        error: error.message
      };
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'torrentstream',
        audience: 'torrentstream-users'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return {
        valid: true,
        decoded,
        expired: false
      };
    } catch (error) {
      return {
        valid: false,
        decoded: null,
        expired: error.name === 'TokenExpiredError',
        error: error.message
      };
    }
  }

  // Decode token without verification (for expired token inspection)
  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      return null;
    }
  }

  // Parse expiration string to milliseconds
  static parseExpiration(expiresIn) {
    if (typeof expiresIn === 'number') {
      return expiresIn * 1000;
    }

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,           // seconds
      m: 60 * 1000,      // minutes  
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000 // days
    };

    return value * multipliers[unit];
  }

  // Generate secure random token for email verification, password reset, etc.
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate email verification token
  static generateEmailVerificationToken() {
    return this.generateSecureToken(32);
  }

  // Generate password reset token
  static generatePasswordResetToken() {
    return this.generateSecureToken(32);
  }

  // Create session token for database storage
  static generateSessionToken() {
    return crypto.randomUUID();
  }

  // Validate token format
  static isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT format: header.payload.signature
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Extract user info from token without verification
  static extractUserInfo(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.payload) {
      return null;
    }

    return {
      userId: decoded.payload.userId,
      username: decoded.payload.username,
      email: decoded.payload.email,
      role: decoded.payload.role,
      status: decoded.payload.status,
      type: decoded.payload.type
    };
  }

  // Check if token is expired
  static isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.payload) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.payload.exp < now;
  }

  // Get token expiration time
  static getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.payload) {
      return null;
    }

    return new Date(decoded.payload.exp * 1000);
  }

  // Calculate time until token expires
  static getTimeUntilExpiration(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return 0;
    }

    const now = new Date();
    return Math.max(0, expiration.getTime() - now.getTime());
  }

  // Validate JWT configuration
  static validateConfiguration() {
    const issues = [];

    if (JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
      issues.push('JWT_SECRET is using default value - change for production');
    }

    if (JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-this-too') {
      issues.push('JWT_REFRESH_SECRET is using default value - change for production');
    }

    if (JWT_SECRET.length < 32) {
      issues.push('JWT_SECRET should be at least 32 characters long');
    }

    if (JWT_REFRESH_SECRET.length < 32) {
      issues.push('JWT_REFRESH_SECRET should be at least 32 characters long');
    }

    if (JWT_SECRET === JWT_REFRESH_SECRET) {
      issues.push('JWT_SECRET and JWT_REFRESH_SECRET should be different');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Get token info for debugging
  static getTokenInfo(token) {
    const decoded = this.decodeToken(token);
    if (!decoded) {
      return null;
    }

    const header = decoded.header;
    const payload = decoded.payload;

    return {
      algorithm: header.alg,
      type: header.typ,
      issuer: payload.iss,
      audience: payload.aud,
      subject: payload.sub,
      issuedAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
      notBefore: payload.nbf ? new Date(payload.nbf * 1000) : null,
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      tokenType: payload.type
    };
  }
}

export default TokenManager;