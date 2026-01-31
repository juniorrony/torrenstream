import RBACManager from './rbacManager.js';

class RBACController {
  constructor(database, rbacManager) {
    this.db = database;
    this.rbac = rbacManager;
  }

  // Get all permissions grouped by category
  getPermissions = async (req, res) => {
    try {
      const permissions = await this.rbac.getAllPermissions();
      res.json({ permissions });
    } catch (error) {
      console.error('Error getting permissions:', error);
      res.status(500).json({ error: 'Failed to get permissions' });
    }
  };

  // Get all roles
  getRoles = async (req, res) => {
    try {
      const roles = await this.rbac.getAllRoles();
      res.json({ roles });
    } catch (error) {
      console.error('Error getting roles:', error);
      res.status(500).json({ error: 'Failed to get roles' });
    }
  };

  // Get specific role with permissions
  getRole = async (req, res) => {
    try {
      const { id } = req.params;
      const role = await this.rbac.getRoleWithPermissions(id);
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json({ role });
    } catch (error) {
      console.error('Error getting role:', error);
      res.status(500).json({ error: 'Failed to get role' });
    }
  };

  // Create new custom role
  createRole = async (req, res) => {
    try {
      const { key, name, description, permissions = [] } = req.body;

      // Validation
      if (!key || !name) {
        return res.status(400).json({ error: 'Role key and name are required' });
      }

      // Check if role key already exists
      const existingRole = await this.rbac.getRoleByKey(key);
      if (existingRole) {
        return res.status(400).json({ error: 'Role key already exists' });
      }

      // Create role
      const roleId = await this.rbac.createRole(key, name, description, permissions, false);

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_role_created',
        resourceType: 'role',
        resourceId: roleId.toString(),
        details: {
          roleKey: key,
          roleName: name,
          permissions,
          createdBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({ 
        success: true, 
        roleId,
        message: 'Role created successfully'
      });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  };

  // Update role permissions
  updateRole = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissions = [] } = req.body;

      // Get existing role
      const existingRole = await this.rbac.getRoleWithPermissions(id);
      if (!existingRole) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if it's a system role
      if (existingRole.is_system) {
        return res.status(400).json({ error: 'Cannot modify system role' });
      }

      // Update role basic info
      if (name || description) {
        await new Promise((resolve, reject) => {
          const updateData = {};
          if (name) updateData.name = name;
          if (description) updateData.description = description;
          updateData.updated_at = new Date().toISOString();

          const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
          const values = Object.values(updateData);
          values.push(id);

          const query = `UPDATE roles SET ${fields} WHERE id = ?`;
          
          this.rbac.db.db.run(query, values, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          });
        });
      }

      // Update permissions
      await this.rbac.updateRolePermissions(id, permissions);

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_role_updated',
        resourceType: 'role',
        resourceId: id,
        details: {
          roleKey: existingRole.key,
          roleName: existingRole.name,
          oldPermissions: existingRole.permissions.map(p => p.key),
          newPermissions: permissions,
          updatedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ 
        success: true, 
        message: 'Role updated successfully' 
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  };

  // Delete custom role
  deleteRole = async (req, res) => {
    try {
      const { id } = req.params;

      // Get role info for logging
      const role = await this.rbac.getRoleWithPermissions(id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Delete role
      const changes = await this.rbac.deleteRole(id);

      if (changes === 0) {
        return res.status(400).json({ error: 'Role could not be deleted' });
      }

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_role_deleted',
        resourceType: 'role',
        resourceId: id,
        details: {
          roleKey: role.key,
          roleName: role.name,
          deletedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ 
        success: true, 
        changes,
        message: 'Role deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: error.message || 'Failed to delete role' });
    }
  };

  // Assign role to user
  assignUserRole = async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleKey, expiresAt = null } = req.body;

      if (!roleKey) {
        return res.status(400).json({ error: 'Role key is required' });
      }

      // Check if user exists
      const user = await this.db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if role exists
      const role = await this.rbac.getRoleByKey(roleKey);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Assign role
      await this.rbac.assignRoleToUser(userId, roleKey, req.user.id, expiresAt);

      // Update legacy user role field for compatibility
      if (['guest', 'user', 'moderator', 'admin'].includes(roleKey)) {
        await this.db.updateUser(userId, { role: roleKey });
      }

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_user_role_assigned',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          targetUser: user.username,
          roleKey,
          roleName: role.name,
          expiresAt,
          assignedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ 
        success: true, 
        message: `Role ${role.name} assigned to ${user.username}` 
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ error: 'Failed to assign role' });
    }
  };

  // Remove role from user
  removeUserRole = async (req, res) => {
    try {
      const { userId, roleKey } = req.params;

      // Check if user exists
      const user = await this.db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if role exists
      const role = await this.rbac.getRoleByKey(roleKey);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Remove role
      const changes = await this.rbac.removeRoleFromUser(userId, roleKey);

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_user_role_removed',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          targetUser: user.username,
          roleKey,
          roleName: role.name,
          removedBy: req.user.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ 
        success: true, 
        changes,
        message: `Role ${role.name} removed from ${user.username}` 
      });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({ error: 'Failed to remove role' });
    }
  };

  // Get user permissions
  getUserPermissions = async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user exists
      const user = await this.db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const permissions = await this.rbac.getUserPermissions(userId);
      const roles = await this.rbac.getUserRoles(userId);

      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        permissions,
        roles: roles.filter(r => r.is_active)
      });
    } catch (error) {
      console.error('Error getting user permissions:', error);
      res.status(500).json({ error: 'Failed to get user permissions' });
    }
  };

  // Get current user permissions (for frontend)
  getMyPermissions = async (req, res) => {
    try {
      const userId = req.user.id;
      const permissions = await this.rbac.getUserPermissions(userId);
      const roles = await this.rbac.getUserRoles(userId);

      res.json({ 
        permissions: permissions.map(p => p.key),
        roles: roles.filter(r => r.is_active).map(r => r.key),
        permissionsDetailed: permissions,
        rolesDetailed: roles.filter(r => r.is_active)
      });
    } catch (error) {
      console.error('Error getting my permissions:', error);
      res.status(500).json({ error: 'Failed to get permissions' });
    }
  };

  // Check if user has specific permission
  checkPermission = async (req, res) => {
    try {
      const { userId, permission } = req.params;
      const hasPermission = await this.rbac.userHasPermission(userId, permission);
      
      res.json({ hasPermission });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ error: 'Failed to check permission' });
    }
  };

  // Bulk assign roles to users
  bulkAssignRoles = async (req, res) => {
    try {
      const { userIds, roleKey, expiresAt = null } = req.body;

      if (!userIds || !Array.isArray(userIds) || !roleKey) {
        return res.status(400).json({ error: 'User IDs array and role key are required' });
      }

      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          const user = await this.db.getUserById(userId);
          if (!user) {
            errors.push({ userId, error: 'User not found' });
            continue;
          }

          await this.rbac.assignRoleToUser(userId, roleKey, req.user.id, expiresAt);
          results.push({ userId, username: user.username, success: true });

          // Log action
          await this.db.logAction({
            userId: req.user.id,
            action: 'rbac_bulk_role_assigned',
            resourceType: 'user',
            resourceId: userId.toString(),
            details: {
              targetUser: user.username,
              roleKey,
              assignedBy: req.user.username
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (error) {
          errors.push({ userId, error: error.message });
        }
      }

      res.json({
        success: true,
        results,
        errors,
        message: `Assigned role to ${results.length} users, ${errors.length} errors`
      });
    } catch (error) {
      console.error('Error bulk assigning roles:', error);
      res.status(500).json({ error: 'Failed to bulk assign roles' });
    }
  };

  // Get RBAC statistics
  getRBACStats = async (req, res) => {
    try {
      const stats = await new Promise((resolve, reject) => {
        const query = `
          SELECT 
            (SELECT COUNT(*) FROM permissions) as total_permissions,
            (SELECT COUNT(*) FROM roles) as total_roles,
            (SELECT COUNT(*) FROM roles WHERE is_system = FALSE) as custom_roles,
            (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE is_active = TRUE) as users_with_roles,
            (SELECT COUNT(*) FROM user_roles WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at > datetime('now')) as temporary_assignments,
            (SELECT COUNT(*) FROM user_roles WHERE is_active = FALSE OR (expires_at IS NOT NULL AND expires_at <= datetime('now'))) as expired_assignments
        `;
        
        this.rbac.db.db.get(query, [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Get permission distribution by category
      const permissionsByCategory = await this.rbac.getAllPermissions();
      const categoryStats = Object.entries(permissionsByCategory).map(([category, permissions]) => ({
        category,
        count: permissions.length
      }));

      res.json({
        stats,
        categoryStats
      });
    } catch (error) {
      console.error('Error getting RBAC stats:', error);
      res.status(500).json({ error: 'Failed to get RBAC statistics' });
    }
  };

  // Export role configurations
  exportRoles = async (req, res) => {
    try {
      const roles = await this.rbac.getAllRoles();
      
      // Create detailed role export
      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: req.user.username,
        roles: await Promise.all(roles.map(async (role) => {
          const fullRole = await this.rbac.getRoleWithPermissions(role.id);
          return {
            key: fullRole.key,
            name: fullRole.name,
            description: fullRole.description,
            isSystem: fullRole.is_system,
            permissions: fullRole.permissions.map(p => p.key),
            userCount: role.user_count
          };
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=rbac-roles-export.json');
      res.send(JSON.stringify(exportData, null, 2));

      // Log action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_roles_exported',
        resourceType: 'system',
        details: {
          exportedBy: req.user.username,
          roleCount: roles.length
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (error) {
      console.error('Error exporting roles:', error);
      res.status(500).json({ error: 'Failed to export roles' });
    }
  };

  // Import role configurations
  importRoles = async (req, res) => {
    try {
      const { roles, overwriteExisting = false } = req.body;

      if (!roles || !Array.isArray(roles)) {
        return res.status(400).json({ error: 'Roles array is required' });
      }

      const results = [];
      const errors = [];
      let imported = 0;
      let skipped = 0;

      for (const roleData of roles) {
        try {
          const { key, name, description, permissions = [], isSystem = false } = roleData;

          if (!key || !name) {
            errors.push({ roleKey: key || 'unknown', error: 'Role key and name are required' });
            continue;
          }

          // Check if role already exists
          const existingRole = await this.rbac.getRoleByKey(key);
          
          if (existingRole) {
            if (!overwriteExisting) {
              skipped++;
              results.push({ 
                roleKey: key, 
                action: 'skipped', 
                reason: 'Role already exists' 
              });
              continue;
            }

            // Update existing role (if not system role)
            if (!existingRole.is_system) {
              await this.rbac.updateRolePermissions(existingRole.id, permissions);
              
              // Update role basic info
              await new Promise((resolve, reject) => {
                const query = `UPDATE roles SET name = ?, description = ?, updated_at = ? WHERE id = ?`;
                this.rbac.db.db.run(query, [name, description, new Date().toISOString(), existingRole.id], function(err) {
                  if (err) reject(err);
                  else resolve(this.changes);
                });
              });

              results.push({ roleKey: key, action: 'updated' });
            } else {
              results.push({ 
                roleKey: key, 
                action: 'skipped', 
                reason: 'Cannot update system role' 
              });
              skipped++;
            }
          } else {
            // Create new role
            const roleId = await this.rbac.createRole(key, name, description, permissions, isSystem);
            results.push({ roleKey: key, action: 'created', roleId });
            imported++;
          }

          // Log individual role import
          await this.db.logAction({
            userId: req.user.id,
            action: 'rbac_role_imported',
            resourceType: 'role',
            resourceId: key,
            details: {
              roleKey: key,
              roleName: name,
              permissions: permissions.length,
              importedBy: req.user.username
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });

        } catch (error) {
          errors.push({ roleKey: roleData.key || 'unknown', error: error.message });
        }
      }

      // Log bulk import action
      await this.db.logAction({
        userId: req.user.id,
        action: 'rbac_roles_imported',
        resourceType: 'system',
        details: {
          totalRoles: roles.length,
          imported,
          skipped,
          errors: errors.length,
          importedBy: req.user.username,
          overwriteExisting
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        summary: {
          total: roles.length,
          imported,
          skipped,
          errors: errors.length
        },
        results,
        errors,
        message: `Import completed: ${imported} created, ${skipped} skipped, ${errors.length} errors`
      });

    } catch (error) {
      console.error('Error importing roles:', error);
      res.status(500).json({ error: 'Failed to import roles' });
    }
  };
}

export default RBACController;