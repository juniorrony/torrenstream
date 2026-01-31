import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Badge,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  Alert,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as UsersIcon,
  Movie as TorrentsIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  BugReport as LogsIcon,
  Notifications as NotificationsIcon,
  ExpandLess,
  ExpandMore,
  PersonAdd as UserAddIcon,
  PersonOff as UserBanIcon,
  PlayCircle as StreamIcon,
  Storage as StorageIcon,
  Speed as PerformanceIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

// Admin routes configuration
const adminRoutes = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    path: '/admin'
  },
  {
    id: 'users',
    label: 'User Management',
    icon: UsersIcon,
    path: '/admin/users',
    badge: 'new',
    children: [
      {
        id: 'users-list',
        label: 'All Users',
        icon: UsersIcon,
        path: '/admin/users'
      },
      {
        id: 'users-add',
        label: 'Add User',
        icon: UserAddIcon,
        path: '/admin/users/add'
      },
      {
        id: 'users-banned',
        label: 'Banned Users',
        icon: UserBanIcon,
        path: '/admin/users/banned'
      }
    ]
  },
  {
    id: 'torrents',
    label: 'Content Management',
    icon: TorrentsIcon,
    path: '/admin/torrents',
    children: [
      {
        id: 'torrents-list',
        label: 'All Torrents',
        icon: TorrentsIcon,
        path: '/admin/torrents'
      },
      {
        id: 'torrents-active',
        label: 'Active Streams',
        icon: StreamIcon,
        path: '/admin/torrents/active'
      }
    ]
  },
  {
    id: 'rbac',
    label: 'RBAC Management',
    icon: SecurityIcon,
    path: '/admin/rbac'
  },
  {
    id: 'system',
    label: 'System',
    icon: SettingsIcon,
    path: '/admin/system',
    children: [
      {
        id: 'system-analytics',
        label: 'Analytics',
        icon: AnalyticsIcon,
        path: '/admin/analytics'
      },
      {
        id: 'system-logs',
        label: 'Audit Logs',
        icon: LogsIcon,
        path: '/admin/logs'
      },
      {
        id: 'system-performance',
        label: 'Performance',
        icon: PerformanceIcon,
        path: '/admin/performance'
      },
      {
        id: 'system-storage',
        label: 'Storage',
        icon: StorageIcon,
        path: '/admin/storage'
      }
    ]
  },
  {
    id: 'security',
    label: 'Security',
    icon: SecurityIcon,
    path: '/admin/security'
  }
];

const DRAWER_WIDTH = 280;

const AdminDashboard = ({ children, currentPage = 'dashboard', onNavigate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { user, isAdmin } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({
    system: true // Keep System menu expanded by default
  });
  const [notifications, setNotifications] = useState([]);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTorrents: 0,
    activeStreams: 0
  });

  // Load admin statistics
  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
      loadNotifications();
    }
  }, [isAdmin]);

  const loadAdminStats = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/stats`, {
        credentials: 'include'
      });
      if (response.ok) {
        const stats = await response.json();
        console.log('📊 Admin stats loaded:', stats);
        // Transform backend format to frontend format
        setAdminStats({
          totalUsers: stats.users?.total || 0,
          activeUsers: stats.users?.active || 0,
          totalTorrents: stats.torrents?.total || 0,
          activeStreams: stats.streaming?.active_sessions || 0,
          // Keep original data for detailed views
          ...stats
        });
      } else {
        console.error('Failed to load admin stats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/admin/notifications`, {
        credentials: 'include'
      });
      if (response.ok) {
        const notifications = await response.json();
        setNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleExpandClick = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getBreadcrumbs = () => {
    const route = adminRoutes.find(r => r.id === currentPage) || 
                  adminRoutes.flatMap(r => r.children || []).find(c => c.id === currentPage);
    
    const breadcrumbs = [
      { label: 'Admin', href: '/admin' }
    ];

    if (route) {
      if (route.id !== 'dashboard') {
        breadcrumbs.push({ label: route.label, href: route.path });
      }
    }

    return breadcrumbs;
  };

  const renderNavItem = (item, level = 0) => {
    const isExpanded = expandedItems[item.id];
    const hasChildren = item.children && item.children.length > 0;
    const isActive = currentPage === item.id;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            selected={isActive}
            onClick={() => hasChildren ? handleExpandClick(item.id) : onNavigate && onNavigate(item.id)}
            sx={{
              pl: 2 + level * 2,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error" variant="dot">
                  <item.icon />
                </Badge>
              ) : (
                <item.icon />
              )}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: isActive ? 600 : 400,
                fontSize: level > 0 ? '0.875rem' : '1rem'
              }}
            />
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderNavItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          🛡️ Admin Panel
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar
            src={user?.avatarUrl}
            sx={{ width: 32, height: 32 }}
          >
            {user?.displayName?.[0] || user?.username?.[0] || 'A'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="500">
              {user?.displayName || user?.username}
            </Typography>
            <Chip
              label={user?.role}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '0.75rem'
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Quick Overview
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Chip
            label={`${adminStats.totalUsers} Users`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${adminStats.totalTorrents} Torrents`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          {adminStats.activeStreams > 0 && (
            <Chip
              label={`${adminStats.activeStreams} Live`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {adminRoutes.map(item => renderNavItem(item))}
        </List>
      </Box>

      {/* Notifications */}
      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              <NotificationsIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              Recent Alerts
            </Typography>
            {notifications.slice(0, 3).map((notif, index) => (
              <Alert 
                key={index} 
                severity={notif.severity || 'info'} 
                sx={{ mb: 1, py: 0 }}
              >
                <Typography variant="caption">
                  {notif.message}
                </Typography>
              </Alert>
            ))}
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumbs */}
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs>
              {getBreadcrumbs().map((crumb, index) => (
                <Link
                  key={index}
                  color="inherit"
                  href={crumb.href}
                  underline="hover"
                >
                  {crumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Notifications Badge */}
          <IconButton color="inherit">
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          p: 3,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AdminDashboard;