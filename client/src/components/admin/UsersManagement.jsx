import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  InputAdornment,
  Grid,
  Paper,
  Fab
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  PersonAdd as AddUserIcon,
  Refresh as RefreshIcon,
  Download as ExportIcon,
  Email as EmailIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // New user form data
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active',
    emailVerified: false
  });

  // Edit user form data
  const [editUserData, setEditUserData] = useState({
    username: '',
    email: '',
    role: 'user',
    status: 'active',
    emailVerified: false
  });

  // Load users with pagination and filters
  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(filterRole && { role: filterRole }),
        ...(filterStatus && { status: filterStatus })
      });

      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
      } else {
        showNotification('Failed to load users', 'error');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, searchQuery, filterRole, filterStatus]);

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(0);
  };

  const handleActionClick = (event, user) => {
    setSelectedUser(user);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
    setSelectedUser(null);
  };

  const handleEditUser = () => {
    if (selectedUser) {
      setEditUserData({
        id: selectedUser.id,
        username: selectedUser.username,
        email: selectedUser.email,
        role: selectedUser.role,
        status: selectedUser.status,
        emailVerified: selectedUser.email_verified
      });
      setEditDialogOpen(true);
    }
    handleActionClose();
  };

  const handleDeleteUser = () => {
    setDeleteDialogOpen(true);
    handleActionClose();
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/suspend`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        showNotification('User suspended successfully', 'success');
        loadUsers();
      } else {
        showNotification('Failed to suspend user', 'error');
      }
    } catch (error) {
      showNotification('Error suspending user', 'error');
    }
    handleActionClose();
  };

  const handleActivateUser = async () => {
    if (!selectedUser) return;

    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/activate`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        showNotification('User activated successfully', 'success');
        loadUsers();
      } else {
        showNotification('Failed to activate user', 'error');
      }
    } catch (error) {
      showNotification('Error activating user', 'error');
    }
    handleActionClose();
  };

  const handleSaveUser = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users/${editUserData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username: editUserData.username,
          email: editUserData.email,
          role: editUserData.role,
          status: editUserData.status,
          email_verified: editUserData.emailVerified
        })
      });

      if (response.ok) {
        showNotification('User updated successfully', 'success');
        setEditDialogOpen(false);
        loadUsers();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      showNotification('Error updating user', 'error');
    }
  };

  const handleCreateUser = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newUserData)
      });

      if (response.ok) {
        showNotification('User created successfully', 'success');
        setAddUserDialogOpen(false);
        setNewUserData({
          username: '',
          email: '',
          password: '',
          role: 'user',
          status: 'active',
          emailVerified: false
        });
        loadUsers();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      showNotification('Error creating user', 'error');
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedUser) return;

    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        showNotification('User deleted successfully', 'success');
        setDeleteDialogOpen(false);
        loadUsers();
      } else {
        showNotification('Failed to delete user', 'error');
      }
    } catch (error) {
      showNotification('Error deleting user', 'error');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'banned': return 'error';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const exportUsers = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/users/export`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification('Users exported successfully', 'success');
      } else {
        showNotification('Failed to export users', 'error');
      }
    } catch (error) {
      showNotification('Error exporting users', 'error');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          User Management
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Export Users">
            <IconButton onClick={exportUsers}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={loadUsers}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={filterRole}
                label="Role"
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="banned">Banned</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchQuery('');
                setFilterRole('');
                setFilterStatus('');
              }}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Verified</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          src={user.avatar_url}
                          sx={{ width: 40, height: 40 }}
                        >
                          {user.display_name?.[0] || user.username[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="500">
                            {user.display_name || user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <VerifiedIcon color="success" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleActionClick(e, user)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalUsers}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Add User FAB */}
      <Fab
        color="primary"
        aria-label="add user"
        onClick={() => setAddUserDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <AddUserIcon />
      </Fab>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={handleEditUser}>
          <EditIcon sx={{ mr: 1 }} />
          Edit User
        </MenuItem>
        {selectedUser?.status === 'active' ? (
          <MenuItem onClick={handleSuspendUser}>
            <BlockIcon sx={{ mr: 1 }} />
            Suspend User
          </MenuItem>
        ) : (
          <MenuItem onClick={handleActivateUser}>
            <ActivateIcon sx={{ mr: 1 }} />
            Activate User
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteUser} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete User
        </MenuItem>
      </Menu>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onClose={() => setAddUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={newUserData.username}
                onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newUserData.role}
                  label="Role"
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="moderator">Moderator</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newUserData.status}
                  label="Status"
                  onChange={(e) => setNewUserData({...newUserData, status: e.target.value})}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="banned">Banned</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={editUserData.username}
                onChange={(e) => setEditUserData({...editUserData, username: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editUserData.role}
                  label="Role"
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="moderator">Moderator</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editUserData.status}
                  label="Status"
                  onChange={(e) => setEditUserData({...editUserData, status: e.target.value})}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="banned">Banned</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUserConfirm} color="error" variant="contained">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      {notification.open && (
        <Alert
          severity={notification.severity}
          onClose={() => setNotification({ ...notification, open: false })}
          sx={{ position: 'fixed', top: 24, right: 24, zIndex: 9999 }}
        >
          {notification.message}
        </Alert>
      )}
    </Box>
  );
};

export default UsersManagement;