import Database from '../database.js';

// Comprehensive permission definitions
const PERMISSIONS = {
  // User Management
  'users.read.all': {
    name: 'View All Users',
    description: 'View all users in the system',
    category: 'User Management'
  },
  'users.read.own': {
    name: 'View Own Profile',
    description: 'View own user profile',
    category: 'User Management'
  },
  'users.create': {
    name: 'Create Users',
    description: 'Create new user accounts',
    category: 'User Management'
  },
  'users.update.all': {
    name: 'Update Any User',
    description: 'Update any user account',
    category: 'User Management'
  },
  'users.update.own': {
    name: 'Update Own Profile',
    description: 'Update own user profile',
    category: 'User Management'
  },
  'users.delete': {
    name: 'Delete Users',
    description: 'Delete user accounts',
    category: 'User Management'
  },
  'users.suspend': {
    name: 'Suspend Users',
    description: 'Suspend user accounts',
    category: 'User Management'
  },
  'users.roles.assign': {
    name: 'Assign Roles',
    description: 'Assign roles to users',
    category: 'User Management'
  },

  // Content Management
  'torrents.read.all': {
    name: 'View All Torrents',
    description: 'View all torrents in the system',
    category: 'Content Management'
  },
  'torrents.read.own': {
    name: 'View Own Torrents',
    description: 'View own uploaded torrents',
    category: 'Content Management'
  },
  'torrents.create': {
    name: 'Upload Torrents',
    description: 'Upload new torrent files',
    category: 'Content Management'
  },
  'torrents.update.all': {
    name: 'Edit Any Torrent',
    description: 'Edit any torrent metadata',
    category: 'Content Management'
  },
  'torrents.update.own': {
    name: 'Edit Own Torrents',
    description: 'Edit own torrent metadata',
    category: 'Content Management'
  },
  'torrents.delete.all': {
    name: 'Delete Any Torrent',
    description: 'Delete any torrent from system',
    category: 'Content Management'
  },
  'torrents.delete.own': {
    name: 'Delete Own Torrents',
    description: 'Delete own uploaded torrents',
    category: 'Content Management'
  },
  'torrents.moderate': {
    name: 'Moderate Content',
    description: 'Approve/reject torrent content',
    category: 'Content Management'
  },

  // Streaming
  'streaming.access': {
    name: 'Stream Content',
    description: 'Access streaming functionality',
    category: 'Streaming'
  },
  'streaming.quality.select': {
    name: 'Quality Selection',
    description: 'Select streaming quality',
    category: 'Streaming'
  },
  'streaming.download': {
    name: 'Download Content',
    description: 'Download content for offline use',
    category: 'Streaming'
  },
  'streaming.cast': {
    name: 'Cast to Device',
    description: 'Cast content to external devices',
    category: 'Streaming'
  },

  // Watch Progress
  'progress.read.all': {
    name: 'View All Progress',
    description: 'View all users\' watch progress',
    category: 'Watch Progress'
  },
  'progress.read.own': {
    name: 'View Own Progress',
    description: 'View own watch progress',
    category: 'Watch Progress'
  },
  'progress.write.own': {
    name: 'Save Progress',
    description: 'Save own watch progress',
    category: 'Watch Progress'
  },
  'progress.delete.all': {
    name: 'Delete Any Progress',
    description: 'Delete any user\'s progress',
    category: 'Watch Progress'
  },

  // System Administration
  'system.dashboard': {
    name: 'System Dashboard',
    description: 'Access system dashboard',
    category: 'System Administration'
  },
  'system.logs.read': {
    name: 'View System Logs',
    description: 'View system and audit logs',
    category: 'System Administration'
  },
  'system.stats.read': {
    name: 'View Statistics',
    description: 'View system statistics',
    category: 'System Administration'
  },
  'system.config.read': {
    name: 'View Configuration',
    description: 'View system configuration',
    category: 'System Administration'
  },
  'system.config.write': {
    name: 'Edit Configuration',
    description: 'Edit system configuration',
    category: 'System Administration'
  },
  'system.backup': {
    name: 'System Backup',
    description: 'Create and manage system backups',
    category: 'System Administration'
  },

  // Role Management
  'roles.read': {
    name: 'View Roles',
    description: 'View all roles and permissions',
    category: 'Role Management'
  },
  'roles.create': {
    name: 'Create Roles',
    description: 'Create new custom roles',
    category: 'Role Management'
  },
  'roles.update': {
    name: 'Update Roles',
    description: 'Update role permissions',
    category: 'Role Management'
  },
  'roles.delete': {
    name: 'Delete Roles',
    description: 'Delete custom roles',
    category: 'Role Management'
  },

  // Moderation
  'moderate.reports': {
    name: 'Handle Reports',
    description: 'View and handle user reports',
    category: 'Moderation'
  },
  'moderate.content.approve': {
    name: 'Approve Content',
    description: 'Approve pending content',
    category: 'Moderation'
  },
  'moderate.content.reject': {
    name: 'Reject Content',
    description: 'Reject inappropriate content',
    category: 'Moderation'
  },
  'moderate.comments': {
    name: 'Moderate Comments',
    description: 'Moderate user comments',
    category: 'Moderation'
  }
};

// Predefined role templates
const ROLE_TEMPLATES = {
  'guest': {
    name: 'Guest',
    description: 'Limited access visitor',
    permissions: []
  },
  'user': {
    name: 'User',
    description: 'Standard registered user',
    permissions: [
      'users.read.own',
      'users.update.own',
      'torrents.read.all',
      'torrents.create',
      'torrents.update.own',
      'torrents.delete.own',
      'streaming.access',
      'streaming.quality.select',
      'streaming.cast',
      'progress.read.own',
      'progress.write.own'
    ]
  },
  'premium': {
    name: 'Premium User',
    description: 'Premium subscription user',
    permissions: [
      'users.read.own',
      'users.update.own',
      'torrents.read.all',
      'torrents.create',
      'torrents.update.own',
      'torrents.delete.own',
      'streaming.access',
      'streaming.quality.select',
      'streaming.download',
      'streaming.cast',
      'progress.read.own',
      'progress.write.own'
    ]
  },
  'moderator': {
    name: 'Moderator',
    description: 'Content moderation specialist',
    permissions: [
      'users.read.own',
      'users.update.own',
      'users.read.all',
      'users.suspend',
      'torrents.read.all',
      'torrents.create',
      'torrents.update.all',
      'torrents.delete.all',
      'torrents.moderate',
      'streaming.access',
      'streaming.quality.select',
      'streaming.download',
      'streaming.cast',
      'progress.read.all',
      'progress.read.own',
      'progress.write.own',
      'system.stats.read',
      'system.logs.read',
      'moderate.reports',
      'moderate.content.approve',
      'moderate.content.reject',
      'moderate.comments'
    ]
  },
  'admin': {
    name: 'Administrator',
    description: 'Full system administrator',
    permissions: Object.keys(PERMISSIONS) // All permissions
  }
};

class RBACManager {
  constructor(database) {
    this.db = database;
    this.permissions = PERMISSIONS;
    this.roleTemplates = ROLE_TEMPLATES;
  }

  // Initialize RBAC tables and data
  async initialize() {
    await this.createRBACTables();
    await this.seedPermissions();
    await this.seedDefaultRoles();
  }

  // Create RBAC database tables
  async createRBACTables() {
    const createPermissionsTable = `
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createRolesTable = `
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createRolePermissionsTable = `
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
      )
    `;

    const createUserRolesTable = `
      CREATE TABLE IF NOT EXISTS user_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        assigned_by INTEGER,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(user_id, role_id)
      )
    `;

    // Create indexes for performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key)',
      'CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category)',
      'CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(key)',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active)'
    ];

    return new Promise((resolve, reject) => {
      this.db.db.serialize(() => {
        this.db.db.run(createPermissionsTable);
        this.db.db.run(createRolesTable);
        this.db.db.run(createRolePermissionsTable);
        this.db.db.run(createUserRolesTable);

        let indexCount = 0;
        createIndexes.forEach(indexSQL => {
          this.db.db.run(indexSQL, (err) => {
            if (err) return reject(err);
            indexCount++;
            if (indexCount === createIndexes.length) {
              resolve();
            }
          });
        });
      });
    });
  }

  // Seed permissions into database
  async seedPermissions() {
    for (const [key, permission] of Object.entries(this.permissions)) {
      try {
        await this.createPermission(key, permission);
      } catch (error) {
        // Permission might already exist, continue
        console.log(`Permission ${key} already exists or error:`, error.message);
      }
    }
  }

  // Seed default roles
  async seedDefaultRoles() {
    for (const [key, role] of Object.entries(this.roleTemplates)) {
      try {
        await this.createRole(key, role.name, role.description, role.permissions, true);
      } catch (error) {
        // Role might already exist, continue
        console.log(`Role ${key} already exists or error:`, error.message);
      }
    }
  }

  // Create a permission
  async createPermission(key, permission) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR IGNORE INTO permissions (key, name, description, category)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.db.run(query, [
        key,
        permission.name,
        permission.description,
        permission.category
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Create a role
  async createRole(key, name, description, permissions = [], isSystem = false) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create role
        const roleQuery = `
          INSERT OR REPLACE INTO roles (key, name, description, is_system)
          VALUES (?, ?, ?, ?)
        `;
        
        const roleId = await new Promise((roleResolve, roleReject) => {
          this.db.db.run(roleQuery, [key, name, description, isSystem], function(err) {
            if (err) {
              roleReject(err);
            } else {
              roleResolve(this.lastID);
            }
          });
        });

        // Assign permissions to role
        if (permissions.length > 0) {
          await this.assignPermissionsToRole(roleId, permissions);
        }

        resolve(roleId);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Assign permissions to a role
  async assignPermissionsToRole(roleId, permissionKeys) {
    // Clear existing permissions for role
    await new Promise((resolve, reject) => {
      this.db.db.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Add new permissions
    for (const permissionKey of permissionKeys) {
      const permission = await this.getPermissionByKey(permissionKey);
      if (permission) {
        await new Promise((resolve, reject) => {
          const query = `
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            VALUES (?, ?)
          `;
          
          this.db.db.run(query, [roleId, permission.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }
  }

  // Get permission by key
  async getPermissionByKey(key) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM permissions WHERE key = ?';
      this.db.db.get(query, [key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Get role by key
  async getRoleByKey(key) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM roles WHERE key = ?';
      this.db.db.get(query, [key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Assign role to user
  async assignRoleToUser(userId, roleKey, assignedBy = null, expiresAt = null) {
    const role = await this.getRoleByKey(roleKey);
    if (!role) {
      throw new Error(`Role ${roleKey} not found`);
    }

    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO user_roles (user_id, role_id, assigned_by, expires_at, is_active)
        VALUES (?, ?, ?, ?, TRUE)
      `;
      
      this.db.db.run(query, [userId, role.id, assignedBy, expiresAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Remove role from user
  async removeRoleFromUser(userId, roleKey) {
    const role = await this.getRoleByKey(roleKey);
    if (!role) {
      throw new Error(`Role ${roleKey} not found`);
    }

    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?';
      this.db.db.run(query, [userId, role.id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Get user permissions
  async getUserPermissions(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT DISTINCT p.key, p.name, p.description, p.category
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? 
          AND ur.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
        ORDER BY p.category, p.name
      `;
      
      this.db.db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // Get user roles
  async getUserRoles(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT r.*, ur.assigned_at, ur.expires_at, ur.is_active
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
        ORDER BY r.name
      `;
      
      this.db.db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // Check if user has permission
  async userHasPermission(userId, permissionKey) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(p => p.key === permissionKey);
  }

  // Check if user has role
  async userHasRole(userId, roleKey) {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.key === roleKey && r.is_active);
  }

  // Get all permissions grouped by category
  async getAllPermissions() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM permissions
        ORDER BY category, name
      `;
      
      this.db.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Group by category
          const grouped = {};
          (rows || []).forEach(permission => {
            if (!grouped[permission.category]) {
              grouped[permission.category] = [];
            }
            grouped[permission.category].push(permission);
          });
          resolve(grouped);
        }
      });
    });
  }

  // Get all roles
  async getAllRoles() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT r.*, 
               COUNT(ur.user_id) as user_count,
               GROUP_CONCAT(p.key) as permissions
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = TRUE
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        GROUP BY r.id
        ORDER BY r.name
      `;
      
      this.db.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const roles = (rows || []).map(role => ({
            ...role,
            user_count: role.user_count || 0,
            permissions: role.permissions ? role.permissions.split(',') : []
          }));
          resolve(roles);
        }
      });
    });
  }

  // Get role with its permissions
  async getRoleWithPermissions(roleId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT r.*, 
               JSON_GROUP_ARRAY(
                 JSON_OBJECT(
                   'id', p.id,
                   'key', p.key,
                   'name', p.name,
                   'description', p.description,
                   'category', p.category
                 )
               ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.id = ?
        GROUP BY r.id
      `;
      
      this.db.db.get(query, [roleId], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          try {
            row.permissions = JSON.parse(row.permissions).filter(p => p.id !== null);
          } catch (e) {
            row.permissions = [];
          }
          resolve(row);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Update role permissions
  async updateRolePermissions(roleId, permissionKeys) {
    try {
      await this.assignPermissionsToRole(roleId, permissionKeys);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to update role permissions: ${error.message}`);
    }
  }

  // Delete custom role
  async deleteRole(roleId) {
    // Check if role is system role
    const role = await new Promise((resolve, reject) => {
      this.db.db.get('SELECT * FROM roles WHERE id = ?', [roleId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.is_system) {
      throw new Error('Cannot delete system role');
    }

    return new Promise((resolve, reject) => {
      this.db.db.run('DELETE FROM roles WHERE id = ?', [roleId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Cleanup expired roles
  async cleanupExpiredRoles() {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE user_roles 
        SET is_active = FALSE 
        WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
      `;
      
      this.db.db.run(query, [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Deactivated ${this.changes} expired role assignments`);
          resolve(this.changes);
        }
      });
    });
  }
}

export default RBACManager;