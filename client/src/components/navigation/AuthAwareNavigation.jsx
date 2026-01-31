import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Badge,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Notifications as NotificationsIcon,
  Movie as MovieIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../auth/AuthModal';

const AuthAwareNavigation = () => {
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    user, 
    logout, 
    isAdmin, 
    isModerator, 
    hasPermission,
    avatarUrl,
    displayName 
  } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    navigate('/');
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleUserMenuClose();
    navigate('/profile?tab=2'); // Navigate to preferences tab
  };

  const handleAdmin = () => {
    handleUserMenuClose();
    navigate('/admin');
  };

  const navItems = [
    { label: 'Home', path: '/', icon: <HomeIcon />, show: true },
    { label: 'Browse', path: '/browse', icon: <SearchIcon />, show: isAuthenticated },
    { label: 'My Library', path: '/library', icon: <MovieIcon />, show: isAuthenticated },
  ];

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {/* Logo/Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
            <MovieIcon sx={{ mr: 1 }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              TorrentStream
            </Typography>
          </Box>

          {/* Navigation Items */}
          <Box sx={{ display: 'flex', gap: 2, mr: 'auto' }}>
            {navItems
              .filter(item => item.show)
              .map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{ 
                    textTransform: 'none',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                  }}
                >
                  {item.label}
                </Button>
              ))}
          </Box>

          {/* Right side - Auth dependent content */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isAuthenticated ? (
              <>
                {/* Admin Access */}
                {isAdmin && (
                  <Tooltip title="Admin Dashboard">
                    <IconButton 
                      color="inherit" 
                      onClick={handleAdmin}
                      sx={{ mr: 1 }}
                    >
                      <AdminIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Notifications */}
                {hasPermission('notifications.read') && (
                  <Tooltip title="Notifications">
                    <IconButton color="inherit" sx={{ mr: 1 }}>
                      <Badge badgeContent={0} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}

                {/* User Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
                      {displayName || 'User'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {isAdmin && (
                        <Chip 
                          label="Admin" 
                          size="small" 
                          color="error" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      )}
                      {isModerator && !isAdmin && (
                        <Chip 
                          label="Mod" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      )}
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={handleUserMenuOpen}
                    sx={{ ml: 1 }}
                  >
                    <Avatar 
                      src={avatarUrl} 
                      sx={{ width: 32, height: 32 }}
                    >
                      {(displayName || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Box>

                {/* User Menu Dropdown */}
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  sx={{ mt: 1 }}
                >
                  <MenuItem onClick={handleProfile}>
                    <ListItemIcon>
                      <AccountIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                  </MenuItem>
                  
                  <MenuItem onClick={handleSettings}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </MenuItem>

                  {isAdmin && (
                    <>
                      <Divider />
                      <MenuItem onClick={handleAdmin}>
                        <ListItemIcon>
                          <SecurityIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Admin Dashboard" />
                      </MenuItem>
                    </>
                  )}

                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                  </MenuItem>
                </Menu>
              </>
            ) : (
              /* Not authenticated - show login button */
              <Button 
                color="inherit" 
                variant="outlined"
                onClick={() => setAuthModalOpen(true)}
                sx={{ 
                  textTransform: 'none',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': { 
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                  }
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Auth Modal for login/register */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </>
  );
};

export default AuthAwareNavigation;