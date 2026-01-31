import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Button
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Movie as MovieIcon,
  PlayCircle as PlayIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, new_week: 0 },
    torrents: { total: 0, active: 0, size_gb: 0 },
    streaming: { active_sessions: 0, total_views: 0 },
    system: { cpu_usage: 0, memory_usage: 0, disk_usage: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    streaming: 'healthy',
    storage: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load system statistics
      const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
      const statsResponse = await fetch(`${API_BASE}/admin/stats`, {
        credentials: 'include'
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        console.error('Failed to load dashboard stats:', statsResponse.status);
      }

      // Load recent activity
      const activityResponse = await fetch(`${API_BASE}/admin/logs?limit=10`, {
        credentials: 'include'
      });
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        // Ensure we have an array (API might return object with logs property)
        const logsArray = Array.isArray(activityData) ? activityData : (activityData.logs || []);
        setRecentActivity(logsArray);
      }

      // Load system health
      const healthResponse = await fetch(`${API_BASE}/health`, {
        credentials: 'include'
      });
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth({
          database: healthData.database || 'healthy',
          streaming: healthData.streaming || 'healthy',
          storage: healthData.storage || 'healthy'
        });
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format bytes
  const formatBytes = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.users?.total || 0),
      subtitle: `${stats.users?.new_week || 0} new this week`,
      icon: PeopleIcon,
      color: '#2196F3',
      trend: stats.users?.new_week > 0 ? 'up' : 'stable'
    },
    {
      title: 'Active Users',
      value: formatNumber(stats.users?.active || 0),
      subtitle: 'Currently online',
      icon: TrendingUpIcon,
      color: '#4CAF50',
      trend: 'stable'
    },
    {
      title: 'Total Torrents',
      value: formatNumber(stats.torrents?.total || 0),
      subtitle: formatBytes((stats.torrents?.size_gb || 0) * 1024 * 1024 * 1024),
      icon: MovieIcon,
      color: '#FF9800',
      trend: 'stable'
    },
    {
      title: 'Active Streams',
      value: formatNumber(stats.streaming?.active_sessions || 0),
      subtitle: `${formatNumber(stats.streaming?.total_views || 0)} total views`,
      icon: PlayIcon,
      color: '#9C27B0',
      trend: 'up'
    }
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System overview and key metrics
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* System Health Alert */}
      {Object.values(systemHealth).some(status => status !== 'healthy') && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={loadDashboardData}>
              Check Again
            </Button>
          }
        >
          System health issues detected. Please review system status.
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}25 100%)`,
                border: `1px solid ${card.color}30`
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color={card.color}>
                      {card.value}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: card.color,
                      width: 56,
                      height: 56
                    }}
                  >
                    <card.icon sx={{ fontSize: 28 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Database</Typography>
                  <Chip
                    icon={getStatusIcon(systemHealth.database)}
                    label={systemHealth.database}
                    color={getStatusColor(systemHealth.database)}
                    size="small"
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Streaming Service</Typography>
                  <Chip
                    icon={getStatusIcon(systemHealth.streaming)}
                    label={systemHealth.streaming}
                    color={getStatusColor(systemHealth.streaming)}
                    size="small"
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Storage System</Typography>
                  <Chip
                    icon={getStatusIcon(systemHealth.storage)}
                    label={systemHealth.storage}
                    color={getStatusColor(systemHealth.storage)}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Resource Usage */}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                Resource Usage
              </Typography>
              
              <Box mb={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2">{stats.system?.cpu_usage || 0}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.system?.cpu_usage || 0}
                  color={stats.system?.cpu_usage > 80 ? 'error' : 'primary'}
                />
              </Box>

              <Box mb={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <Typography variant="body2">{stats.system?.memory_usage || 0}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.system?.memory_usage || 0}
                  color={stats.system?.memory_usage > 80 ? 'error' : 'primary'}
                />
              </Box>

              <Box>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">Disk Usage</Typography>
                  <Typography variant="body2">{stats.system?.disk_usage || 0}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.system?.disk_usage || 0}
                  color={stats.system?.disk_usage > 80 ? 'error' : 'primary'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(Array.isArray(recentActivity) ? recentActivity : []).slice(0, 8).map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                              {activity.username?.[0] || 'U'}
                            </Avatar>
                            <Typography variant="body2">
                              {activity.username || 'System'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {activity.action}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(activity.created_at).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {(!Array.isArray(recentActivity) || recentActivity.length === 0) && (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    No recent activity
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardOverview;