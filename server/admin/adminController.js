import AuthMiddleware from '../auth/authMiddleware.js';

class AdminController {
  constructor(database) {
    this.db = database;
  }

  // Get admin dashboard statistics
  getStats = async (req, res) => {
    try {
      const stats = await this.db.getAdminStats();
      
      // Add system stats (mock data for now - could be enhanced with actual system monitoring)
      const systemStats = {
        cpu_usage: Math.floor(Math.random() * 50) + 20, // Mock: 20-70%
        memory_usage: Math.floor(Math.random() * 40) + 30, // Mock: 30-70%
        disk_usage: Math.floor(Math.random() * 30) + 40 // Mock: 40-70%
      };
      
      res.json({
        users: {
          total: stats.total_users,
          active: stats.active_users,
          new_week: stats.new_users_week
        },
        torrents: {
          total: stats.total_torrents,
          active: 0, // Could be enhanced with active torrent tracking
          size_gb: Math.floor(Math.random() * 1000) // Mock data
        },
        streaming: {
          active_sessions: stats.active_sessions,
          total_views: stats.total_views
        },
        system: systemStats
      });
    } catch (error) {
      console.error('Error getting admin stats:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  };

  // Get all users with pagination and filters
  getUsers = async (req, res) => {
    try {
      const { 
        page = 0, 
        limit = 10, 
        search = '', 
        role = '', 
        status = '' 
      } = req.query;

      const filters = {
        ...(search && { search }),
        ...(role && { role }),
        ...(status && { status }),
        limit: parseInt(limit),
        offset: parseInt(page) * parseInt(limit)
      };

      const users = await this.db.getAllUsers(filters);
      const totalUsers = await this.db.getUserCount(filters);

      // Remove sensitive data
      const safeUsers = users.map(user => {
        const { password_hash, email_verification_token, password_reset_token, ...safeUser } = user;
        return safeUser;
      });

      res.json({
        users: safeUsers,
        total: totalUsers,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  };

  // Get specific user
  getUser = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await this.db.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove sensitive data
      const { password_hash, email_verification_token, password_reset_token, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  };

  // Create new user
  createUser = async (req, res) => {
    try {
      const { username, email, password, role = 'user', status = 'pending', emailVerified = false } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      // Check if user exists
      const existingUser = await this.db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const existingUsername = await this.db.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Hash password
      const PasswordUtils = await import('../utils/passwordUtils.js');
      const passwordHash = await PasswordUtils.default.hashPassword(password);

      // Create user
      const result = await this.db.createUser({
        username,
        email,
        passwordHash,
        role,
        status,
        emailVerified
      });

      // Create user profile
      await this.db.createUserProfile(result.id, {
        displayName: username,
        preferences: {
          theme: 'dark',
          notifications: true,
          defaultQuality: 'auto'
        }
      });

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'admin_user_created',
        resourceType: 'user',
        resourceId: result.id.toString(),
        details: {
          username,
          email,
          role,
          createdBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        user: { id: result.id, username, email, role, status }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  };

  // Update user
  updateUser = async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, role, status, email_verified } = req.body;

      // Check if user exists
      const existingUser = await this.db.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prepare update data
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (email_verified !== undefined) updateData.email_verified = email_verified;

      // Update user
      const changes = await this.db.updateUser(id, updateData);

      if (changes === 0) {
        return res.status(400).json({ error: 'No changes made' });
      }

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'admin_user_updated',
        resourceType: 'user',
        resourceId: id,
        details: {
          changes: updateData,
          updatedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ success: true, changes });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  };

  // Delete user
  deleteUser = async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await this.db.getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't allow deleting yourself
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }

      // Delete user
      const changes = await this.db.deleteUser(id);

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'admin_user_deleted',
        resourceType: 'user',
        resourceId: id,
        details: {
          deletedUser: existingUser.username,
          deletedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ success: true, changes });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  };

  // Suspend user
  suspendUser = async (req, res) => {
    try {
      const { id } = req.params;

      const changes = await this.db.updateUser(id, { status: 'suspended' });

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'admin_user_suspended',
        resourceType: 'user',
        resourceId: id,
        details: {
          suspendedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ success: true, changes });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ error: 'Failed to suspend user' });
    }
  };

  // Activate user
  activateUser = async (req, res) => {
    try {
      const { id } = req.params;

      const changes = await this.db.updateUser(id, { status: 'active' });

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'admin_user_activated',
        resourceType: 'user',
        resourceId: id,
        details: {
          activatedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ success: true, changes });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ error: 'Failed to activate user' });
    }
  };

  // Get audit logs
  getLogs = async (req, res) => {
    try {
      const { 
        page = 0, 
        limit = 50, 
        userId = null, 
        action = null, 
        resourceType = null 
      } = req.query;

      const filters = {
        ...(userId && { userId }),
        ...(action && { action }),
        ...(resourceType && { resourceType }),
        limit: parseInt(limit),
        offset: parseInt(page) * parseInt(limit)
      };

      const logs = await this.db.getAuditLogs(filters);

      res.json({
        logs,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error getting logs:', error);
      res.status(500).json({ error: 'Failed to get logs' });
    }
  };

  // Get notifications (recent important events)
  getNotifications = async (req, res) => {
    try {
      // Get recent important events
      const logs = await this.db.getAuditLogs({
        action: ['admin_user_created', 'admin_user_deleted', 'login_failed'],
        limit: 10
      });

      const notifications = logs.map(log => ({
        severity: log.action.includes('failed') || log.action.includes('deleted') ? 'warning' : 'info',
        message: this.formatLogMessage(log),
        timestamp: log.created_at
      }));

      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  };

  // Export users to CSV
  exportUsers = async (req, res) => {
    try {
      const users = await this.db.getAllUsers({ limit: 10000 });
      
      // Create CSV content
      const csvHeaders = 'ID,Username,Email,Role,Status,Email Verified,Created At,Last Login\n';
      const csvRows = users.map(user => {
        return [
          user.id,
          user.username,
          user.email,
          user.role,
          user.status,
          user.email_verified ? 'Yes' : 'No',
          user.created_at,
          user.last_login || 'Never'
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csvContent = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
      res.send(csvContent);

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'admin_users_exported',
        resourceType: 'system',
        details: {
          exportedBy: req.user.username,
          userCount: users.length
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({ error: 'Failed to export users' });
    }
  };

  // Helper function to format log messages
  formatLogMessage = (log) => {
    switch (log.action) {
      case 'admin_user_created':
        return `New user "${log.details?.username}" created`;
      case 'admin_user_deleted':
        return `User "${log.details?.deletedUser}" deleted`;
      case 'login_failed':
        return `Failed login attempt for ${log.details?.identifier}`;
      case 'admin_user_suspended':
        return `User suspended`;
      case 'admin_user_activated':
        return `User activated`;
      default:
        return log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
}

export default AdminController;