import TokenManager from '../utils/tokenManager.js';

// Permission definitions
const PERMISSIONS = {
  // Torrents
  'torrents.read': ['user', 'moderator', 'admin'],
  'torrents.create': ['user', 'moderator', 'admin'],
  'torrents.update': ['moderator', 'admin'],
  'torrents.delete': ['moderator', 'admin'],
  
  // Users
  'users.read.own': ['user', 'moderator', 'admin'],
  'users.read.all': ['admin'],
  'users.update.own': ['user', 'moderator', 'admin'],
  'users.update.all': ['admin'],
  'users.delete': ['admin'],
  'users.manage': ['admin'],
  
  // Watch Progress
  'progress.read.own': ['user', 'moderator', 'admin'],
  'progress.read.all': ['moderator', 'admin'],
  'progress.write.own': ['user', 'moderator', 'admin'],
  'progress.write.all': ['admin'],
  
  // System
  'system.logs': ['admin'],
  'system.stats': ['moderator', 'admin'],
  'system.config': ['admin'],
  
  // Content Moderation
  'content.moderate': ['moderator', 'admin'],
  'content.reports': ['moderator', 'admin'],
  
  // Admin Dashboard
  'admin.dashboard': ['admin'],
  'admin.users': ['admin'],
  'admin.system': ['admin']
};

class AuthMiddleware {
  constructor(database) {
    this.db = database;
  }

  // Extract token from request
  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in cookies
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }
    
    return null;
  }

  // Main authentication middleware
  authenticate(options = {}) {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          if (options.optional) {
            req.user = null;
            return next();
          }
          
          return res.status(401).json({
            error: 'Authentication required',
            code: 'NO_TOKEN'
          });
        }

        // Verify token
        const verification = TokenManager.verifyAccessToken(token);
        
        if (!verification.valid) {
          if (verification.expired) {
            return res.status(401).json({
              error: 'Token expired',
              code: 'TOKEN_EXPIRED'
            });
          }
          
          return res.status(401).json({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
          });
        }

        // Get user from database to ensure they still exist and are active
        const user = await this.db.getUserById(verification.decoded.userId);
        
        if (!user) {
          return res.status(401).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // Check user status
        if (user.status === 'banned') {
          return res.status(403).json({
            error: 'Account has been banned',
            code: 'ACCOUNT_BANNED'
          });
        }

        if (user.status === 'suspended') {
          return res.status(403).json({
            error: 'Account is suspended',
            code: 'ACCOUNT_SUSPENDED'
          });
        }

        if (user.status === 'pending' && !options.allowPending) {
          return res.status(403).json({
            error: 'Account verification required',
            code: 'ACCOUNT_PENDING'
          });
        }

        // Attach user to request
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.email_verified,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          permissions: this.getUserPermissions(user.role)
        };

        // Store client info for logging
        req.clientInfo = {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        };

        next();

      } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
          error: 'Authentication service error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  // Role-based authorization middleware
  requireRole(allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role
        });
      }

      next();
    };
  }

  // Permission-based authorization middleware
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!this.hasPermission(req.user.role, permission)) {
        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required: permission,
          userRole: req.user.role
        });
      }

      next();
    };
  }

  // Resource ownership middleware (for user-specific resources)
  requireOwnership(resourceUserIdField = 'userId') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Get resource user ID from params, body, or query
      const resourceUserId = req.params[resourceUserIdField] || 
                            req.body[resourceUserIdField] || 
                            req.query[resourceUserIdField];

      // Allow access if it's the user's own resource
      if (resourceUserId && parseInt(resourceUserId) === req.user.id) {
        return next();
      }

      // Check if user ID matches for watch progress (string comparison)
      if (resourceUserId && resourceUserId.toString() === req.user.id.toString()) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied to this resource',
        code: 'RESOURCE_ACCESS_DENIED'
      });
    };
  }

  // Admin only middleware
  requireAdmin() {
    return this.requireRole(['admin']);
  }

  // Moderator or admin middleware
  requireModerator() {
    return this.requireRole(['moderator', 'admin']);
  }

  // Verified email middleware
  requireVerifiedEmail() {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!req.user.emailVerified) {
        return res.status(403).json({
          error: 'Email verification required',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      next();
    };
  }

  // Rate limiting by user
  rateLimitByUser(maxRequests, windowMs) {
    const userRequests = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next(); // Skip rate limiting for unauthenticated users
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (userRequests.has(userId)) {
        const requests = userRequests.get(userId);
        const validRequests = requests.filter(time => time > windowStart);
        userRequests.set(userId, validRequests);
      }

      // Get current requests
      const currentRequests = userRequests.get(userId) || [];

      if (currentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((currentRequests[0] - windowStart) / 1000)
        });
      }

      // Add current request
      currentRequests.push(now);
      userRequests.set(userId, currentRequests);

      next();
    };
  }

  // Get user permissions based on role
  getUserPermissions(role) {
    const permissions = [];
    
    for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
      if (allowedRoles.includes(role)) {
        permissions.push(permission);
      }
    }
    
    return permissions;
  }

  // Check if user has specific permission
  hasPermission(userRole, permission) {
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles && allowedRoles.includes(userRole);
  }

  // Log user action
  async logAction(req, action, resourceType = null, resourceId = null, details = {}) {
    if (req.user && this.db) {
      try {
        await this.db.logAction({
          userId: req.user.id,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress: req.clientInfo?.ipAddress,
          userAgent: req.clientInfo?.userAgent
        });
      } catch (error) {
        console.error('Failed to log user action:', error);
      }
    }
  }

  // Middleware to log actions
  logUserAction(action, resourceType = null) {
    return async (req, res, next) => {
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(body) {
        // Log action after successful response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resourceId = req.params.id || req.params.torrentId || body?.id;
          
          setImmediate(() => {
            req.authMiddleware?.logAction(req, action, resourceType, resourceId?.toString(), {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode
            });
          });
        }
        
        return originalJson.call(this, body);
      };

      req.authMiddleware = this;
      next();
    };
  }

  // Check if user can access resource
  canAccessResource(user, resource, action = 'read') {
    if (!user) return false;
    
    // Admin can do everything
    if (user.role === 'admin') return true;
    
    // Check specific permissions
    const permissionKey = `${resource}.${action}`;
    return this.hasPermission(user.role, permissionKey);
  }

  // Middleware to check resource access
  requireResourceAccess(resource, action = 'read') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!this.canAccessResource(req.user, resource, action)) {
        return res.status(403).json({
          error: 'Access denied to this resource',
          code: 'RESOURCE_ACCESS_DENIED',
          resource,
          action
        });
      }

      next();
    };
  }

  // Get middleware for common auth patterns
  static getMiddleware(database) {
    const auth = new AuthMiddleware(database);
    
    return {
      // Basic authentication
      authenticate: auth.authenticate(),
      authenticateOptional: auth.authenticate({ optional: true }),
      
      // Role-based
      requireAdmin: auth.requireAdmin(),
      requireModerator: auth.requireModerator(),
      requireUser: auth.requireRole(['user', 'moderator', 'admin']),
      
      // Permission-based
      requireTorrentRead: auth.requirePermission('torrents.read'),
      requireTorrentCreate: auth.requirePermission('torrents.create'),
      requireTorrentUpdate: auth.requirePermission('torrents.update'),
      requireTorrentDelete: auth.requirePermission('torrents.delete'),
      
      requireUserManagement: auth.requirePermission('users.manage'),
      requireSystemStats: auth.requirePermission('system.stats'),
      requireSystemConfig: auth.requirePermission('system.config'),
      
      // Resource ownership
      requireOwnership: auth.requireOwnership(),
      requireOwnResource: auth.requireOwnership('userId'),
      
      // Special requirements
      requireVerifiedEmail: auth.requireVerifiedEmail(),
      
      // Rate limiting
      rateLimitUser: auth.rateLimitByUser.bind(auth),
      
      // Action logging
      logAction: auth.logUserAction.bind(auth)
    };
  }
}

export default AuthMiddleware;