import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  AccountCircle as ProfileIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const UserMenu = ({ trigger }) => {
  const { 
    user, 
    logout, 
    isEmailVerified, 
    isAdmin, 
    isModerator, 
    displayName, 
    avatarUrl 
  } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    setLogoutDialogOpen(false);
    handleClose();
    await logout();
  };

  const handleProfile = () => {
    handleClose();
    // Navigate to profile page
    window.location.href = '/profile';
  };

  const handleSettings = () => {
    handleClose();
    // Navigate to settings/preferences in profile
    window.location.href = '/profile?tab=2'; // Tab 2 is preferences
  };

  const handleAdmin = () => {
    handleClose();
    // Open admin dashboard in new tab for now
    window.open('/admin', '_blank');
  };

  if (!user) {
    return null;
  }

  // Generate avatar fallback
  const getAvatarFallback = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'moderator': return 'warning';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  return (
    <>
      {/* Trigger Element */}
      {trigger ? (
        React.cloneElement(trigger, { onClick: handleClick })
      ) : (
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2 }}
          aria-controls={open ? 'account-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Avatar
            src={avatarUrl}
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: '0.875rem'
            }}
          >
            {getAvatarFallback(displayName)}
          </Avatar>
        </IconButton>
      )}

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 280,
            borderRadius: 2,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box display="flex" alignItems="center" mb={1}>
            <Avatar
              src={avatarUrl}
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                mr: 1.5
              }}
            >
              {getAvatarFallback(displayName)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="600">
                {displayName || user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>
          </Box>

          {/* Status Chips */}
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip
              label={user.role}
              size="small"
              color={getRoleColor(user.role)}
              variant="outlined"
            />
            
            {isEmailVerified ? (
              <Chip
                icon={<VerifiedIcon />}
                label="Verified"
                size="small"
                color="success"
                variant="outlined"
              />
            ) : (
              <Chip
                icon={<WarningIcon />}
                label="Unverified"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Divider />

        {/* Menu Items */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            My Profile
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Settings
          </ListItemText>
        </MenuItem>

        {/* Admin Menu Item */}
        {(isAdmin || isModerator) && (
          <>
            <Divider />
            <MenuItem onClick={handleAdmin}>
              <ListItemIcon>
                <AdminIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {isAdmin ? 'Admin Dashboard' : 'Moderation'}
              </ListItemText>
            </MenuItem>
          </>
        )}

        <Divider />

        {/* Logout */}
        <MenuItem 
          onClick={() => setLogoutDialogOpen(true)}
          sx={{
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            }
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'inherit' }} />
          </ListItemIcon>
          <ListItemText>
            Sign Out
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Sign Out
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out? Any unsaved changes will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setLogoutDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLogout}
            color="error"
            variant="contained"
            startIcon={<LogoutIcon />}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserMenu;