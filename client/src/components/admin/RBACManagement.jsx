import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Tabs,
  Tab,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  LinearProgress,
  Avatar,
  AvatarGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  GetApp as ExportIcon,
  Publish as ImportIcon,
  Info as InfoIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ModeratorIcon,
  Person as UserIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`rbac-tabpanel-${index}`}
    aria-labelledby={`rbac-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const RBACManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Data states
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [users, setUsers] = useState([]);
  const [rbacStats, setRbacStats] = useState({});

  // Dialog states
  const [roleDialog, setRoleDialog] = useState({ open: false, mode: 'create', role: null });
  const [assignRoleDialog, setAssignRoleDialog] = useState({ open: false, selectedUsers: [] });
  const [importDialog, setImportDialog] = useState({ open: false });

  // Form states
  const [roleForm, setRoleForm] = useState({
    key: '',
    name: '',
    description: '',
    permissions: []
  });

  // Pagination states
  const [usersPage, setUsersPage] = useState(0);
  const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRoles(),
        loadPermissions(),
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/rbac/roles`, {
        credentials: 'include'
      });
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/rbac/permissions`, {
        credentials: 'include'
      });
      const data = await response.json();
      setPermissions(data.permissions || {});
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadStats = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/rbac/stats`, {
        credentials: 'include'
      });
      const data = await response.json();
      setRbacStats(data.stats || {});
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCreateRole = () => {
    setRoleForm({
      key: '',
      name: '',
      description: '',
      permissions: []
    });
    setRoleDialog({ open: true, mode: 'create', role: null });
  };

  const handleEditRole = (role) => {
    setRoleForm({
      key: role.key,
      name: role.name,
      description: role.description || '',
      permissions: role.permissions?.map(p => p.key) || []
    });
    setRoleDialog({ open: true, mode: 'edit', role });
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showSnackbar('Role deleted successfully', 'success');
        loadRoles();
      } else {
        const data = await response.json();
        showSnackbar(data.error || 'Failed to delete role', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to delete role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleForm.key || !roleForm.name) {
      showSnackbar('Role key and name are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const url = roleDialog.mode === 'create' 
        ? '/api/rbac/roles' 
        : `/api/rbac/roles/${roleDialog.role.id}`;
      
      const method = roleDialog.mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(roleForm)
      });

      if (response.ok) {
        showSnackbar(`Role ${roleDialog.mode === 'create' ? 'created' : 'updated'} successfully`, 'success');
        setRoleDialog({ open: false, mode: 'create', role: null });
        loadRoles();
      } else {
        const data = await response.json();
        showSnackbar(data.error || 'Failed to save role', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to save role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permissionKey, checked) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permissionKey]
        : prev.permissions.filter(p => p !== permissionKey)
    }));
  };

  const handleExportRoles = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/rbac/roles/export`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rbac-roles-export.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSnackbar('Roles exported successfully', 'success');
      } else {
        showSnackbar('Failed to export roles', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to export roles', 'error');
    }
  };

  const handleAssignRole = async (userId, roleKey) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rbac/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ roleKey })
      });

      if (response.ok) {
        showSnackbar('Role assigned successfully', 'success');
        loadUsers();
      } else {
        const data = await response.json();
        showSnackbar(data.error || 'Failed to assign role', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to assign role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (userId, roleKey) => {
    if (!window.confirm('Are you sure you want to remove this role from the user?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rbac/users/${userId}/roles/${roleKey}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showSnackbar('Role removed successfully', 'success');
        loadUsers();
      } else {
        const data = await response.json();
        showSnackbar(data.error || 'Failed to remove role', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to remove role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleIcon = (roleKey) => {
    switch (roleKey) {
      case 'admin': return <AdminIcon color="error" />;
      case 'moderator': return <ModeratorIcon color="warning" />;
      case 'premium': return <ShieldIcon color="primary" />;
      default: return <UserIcon />;
    }
  };

  const getRoleColor = (roleKey) => {
    switch (roleKey) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'premium': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader
          title="RBAC Management"
          subheader="Manage roles, permissions, and user access control"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<ExportIcon />}
                onClick={handleExportRoles}
                disabled={loading}
              >
                Export
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateRole}
                disabled={loading}
              >
                Create Role
              </Button>
            </Box>
          }
        />
        
        {loading && <LinearProgress variant="indeterminate" />}
        
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="RBAC tabs"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Overview" icon={<InfoIcon />} />
            <Tab label="Roles" icon={<SecurityIcon />} />
            <Tab label="Permissions" icon={<AssignmentIcon />} />
            <Tab label="User Roles" icon={<GroupIcon />} />
          </Tabs>

          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {rbacStats.total_roles || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Roles
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary.main">
                    {rbacStats.custom_roles || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Custom Roles
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {rbacStats.users_with_roles || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Users with Roles
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {rbacStats.total_permissions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Permissions
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  System Roles
                </Typography>
                <Grid container spacing={2}>
                  {roles.filter(role => role.is_system).map((role) => (
                    <Grid item xs={12} sm={6} md={4} key={role.id}>
                      <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {getRoleIcon(role.key)}
                          <Typography variant="h6">{role.name}</Typography>
                          <Chip
                            size="small"
                            label="System"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {role.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.user_count || 0} users
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Roles Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Role Management
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Create and manage custom roles with specific permission sets
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {roles.map((role) => (
                <Grid item xs={12} md={6} lg={4} key={role.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getRoleIcon(role.key)}
                          <Typography variant="h6">{role.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {role.is_system && (
                            <Chip size="small" label="System" color="primary" variant="outlined" />
                          )}
                          {!role.is_system && (
                            <>
                              <Tooltip title="Edit Role">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditRole(role)}
                                  disabled={loading}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Role">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteRole(role.id)}
                                  disabled={loading}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {role.description || 'No description provided'}
                      </Typography>
                      
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {role.user_count || 0} users • {role.permission_count || 0} permissions
                        </Typography>
                        <Chip
                          size="small"
                          label={role.key}
                          color={getRoleColor(role.key)}
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Permissions Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Permission Categories
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Available permissions organized by category
            </Typography>

            {Object.entries(permissions).map(([category, categoryPermissions]) => (
              <Accordion key={category} sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {category} ({categoryPermissions.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={1}>
                    {categoryPermissions.map((permission) => (
                      <Grid item xs={12} sm={6} md={4} key={permission.key}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="body2" fontWeight="500">
                            {permission.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.key}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {permission.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </TabPanel>

          {/* User Roles Tab */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom>
              User Role Assignments
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Manage role assignments for users
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Roles</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users
                    .slice(usersPage * usersRowsPerPage, usersPage * usersRowsPerPage + usersRowsPerPage)
                    .map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {userItem.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">
                            {userItem.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {userItem.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={userItem.status}
                          color={userItem.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {userItem.roles?.map((userRole) => (
                            <Chip
                              key={userRole}
                              size="small"
                              label={userRole}
                              color={getRoleColor(userRole)}
                              onDelete={() => handleRemoveRole(userItem.id, userRole)}
                              disabled={loading}
                            />
                          )) || (
                            <Typography variant="caption" color="text.secondary">
                              No roles assigned
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setAssignRoleDialog({ 
                            open: true, 
                            selectedUsers: [userItem] 
                          })}
                          disabled={loading}
                        >
                          Assign Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={users.length}
                page={usersPage}
                onPageChange={(event, newPage) => setUsersPage(newPage)}
                rowsPerPage={usersRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setUsersRowsPerPage(parseInt(event.target.value, 10));
                  setUsersPage(0);
                }}
              />
            </TableContainer>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Role Creation/Edit Dialog */}
      <Dialog
        open={roleDialog.open}
        onClose={() => setRoleDialog({ open: false, mode: 'create', role: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {roleDialog.mode === 'create' ? 'Create New Role' : 'Edit Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Role Key"
                value={roleForm.key}
                onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })}
                disabled={roleDialog.mode === 'edit' || loading}
                helperText="Unique identifier for the role (e.g., content_moderator)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Role Name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Permissions</FormLabel>
                {Object.entries(permissions).map(([category, categoryPermissions]) => (
                  <Box key={category} sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {category}
                    </Typography>
                    <FormGroup row>
                      {categoryPermissions.map((permission) => (
                        <FormControlLabel
                          key={permission.key}
                          control={
                            <Checkbox
                              checked={roleForm.permissions.includes(permission.key)}
                              onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                              disabled={loading}
                            />
                          }
                          label={
                            <Tooltip title={permission.description} placement="top">
                              <span>{permission.name}</span>
                            </Tooltip>
                          }
                          sx={{ minWidth: 200 }}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                ))}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRoleDialog({ open: false, mode: 'create', role: null })}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveRole}
            disabled={loading || !roleForm.key || !roleForm.name}
          >
            {roleDialog.mode === 'create' ? 'Create Role' : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog
        open={assignRoleDialog.open}
        onClose={() => setAssignRoleDialog({ open: false, selectedUsers: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Role to User</DialogTitle>
        <DialogContent>
          {assignRoleDialog.selectedUsers.map((selectedUser) => (
            <Box key={selectedUser.id} sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Assign role to: <strong>{selectedUser.username}</strong>
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <FormLabel>Select Role</FormLabel>
                <Box sx={{ mt: 1 }}>
                  {roles.map((role) => (
                    <Button
                      key={role.id}
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        handleAssignRole(selectedUser.id, role.key);
                        setAssignRoleDialog({ open: false, selectedUsers: [] });
                      }}
                      disabled={loading}
                      sx={{ mr: 1, mb: 1 }}
                      startIcon={getRoleIcon(role.key)}
                    >
                      {role.name}
                    </Button>
                  ))}
                </Box>
              </FormControl>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAssignRoleDialog({ open: false, selectedUsers: [] })}
            disabled={loading}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RBACManagement;