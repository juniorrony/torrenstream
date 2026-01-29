import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Divider,
  Stack,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  CloudUpload as UploadIcon,
  Storage as StorageIcon,
  PlayCircle as PlayIcon,
  People as PeersIcon,
  Speed as SpeedIcon,
  Timeline as ActivityIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CompletedIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTorrents } from '../context/TorrentContext';
import { formatBytes, formatSpeed, formatProgress } from '../utils/helpers';

const Dashboard = ({ onPlayFile }) => {
  const { torrents, loading, connected, refreshTorrents } = useTorrents();
  const [stats, setStats] = useState({
    totalTorrents: 0,
    activeTorrents: 0,
    completedTorrents: 0,
    totalSize: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    totalPeers: 0,
    diskSpace: { used: 0, total: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemInfo, setSystemInfo] = useState({
    uptime: 0,
    memory: { used: 0, total: 0 },
    cpu: 0
  });

  // Calculate statistics from torrents
  useEffect(() => {
    const newStats = torrents.reduce(
      (acc, torrent) => {
        acc.totalTorrents += 1;
        acc.totalSize += torrent.size || 0;
        acc.downloadSpeed += torrent.download_speed || 0;
        acc.uploadSpeed += torrent.upload_speed || 0;
        acc.totalPeers += torrent.peers || 0;

        if (torrent.status === 'downloading') {
          acc.activeTorrents += 1;
        } else if (torrent.status === 'completed') {
          acc.completedTorrents += 1;
        }

        return acc;
      },
      {
        totalTorrents: 0,
        activeTorrents: 0,
        completedTorrents: 0,
        totalSize: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        totalPeers: 0,
        diskSpace: { used: 0, total: 0 }
      }
    );

    setStats(newStats);

    // Update recent activity (last 5 torrents)
    const recent = torrents
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5)
      .map(torrent => ({
        id: torrent.id,
        name: torrent.name,
        action: torrent.status === 'completed' ? 'Completed' : 
               torrent.status === 'downloading' ? 'Downloading' : 'Added',
        time: new Date(torrent.updated_at).toLocaleTimeString(),
        status: torrent.status,
        progress: torrent.progress
      }));

    setRecentActivity(recent);
  }, [torrents]);

  const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend }) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h5" component="h2" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography color="textSecondary" variant="body2">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const ActivityItem = ({ activity }) => {
    const getStatusIcon = (status) => {
      switch (status) {
        case 'completed':
          return <CompletedIcon color="success" />;
        case 'downloading':
          return <DownloadIcon color="primary" />;
        case 'error':
          return <ErrorIcon color="error" />;
        default:
          return <PendingIcon color="warning" />;
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed':
          return 'success';
        case 'downloading':
          return 'primary';
        case 'error':
          return 'error';
        default:
          return 'warning';
      }
    };

    return (
      <ListItem>
        <Box display="flex" alignItems="center" width="100%">
          <Avatar sx={{ mr: 2, bgcolor: 'transparent' }}>
            {getStatusIcon(activity.status)}
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="body2" noWrap>
              {activity.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={activity.action} 
                size="small" 
                color={getStatusColor(activity.status)}
              />
              <Typography variant="caption" color="textSecondary">
                {activity.time}
              </Typography>
              {activity.status === 'downloading' && (
                <Typography variant="caption" color="textSecondary">
                  {formatProgress(activity.progress)}%
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </ListItem>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Chip 
            label={connected ? 'Online' : 'Offline'} 
            color={connected ? 'success' : 'error'}
            icon={connected ? <CheckCircle /> : <ErrorIcon />}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshTorrents}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Torrents"
            value={stats.totalTorrents}
            subtitle={`${stats.activeTorrents} active`}
            icon={<StorageIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Download Speed"
            value={formatSpeed(stats.downloadSpeed)}
            subtitle="Current rate"
            icon={<DownloadIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Upload Speed"
            value={formatSpeed(stats.uploadSpeed)}
            subtitle="Current rate"
            icon={<UploadIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Peers"
            value={stats.totalPeers}
            subtitle="Connected"
            icon={<PeersIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Detailed Info */}
      <Grid container spacing={3}>
        {/* Active Downloads */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">Active Downloads</Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.activeTorrents} active
              </Typography>
            </Box>
            
            {stats.activeTorrents === 0 ? (
              <Alert severity="info">No active downloads at the moment</Alert>
            ) : (
              <Stack spacing={2}>
                {torrents
                  .filter(t => t.status === 'downloading')
                  .map((torrent) => (
                    <Card key={torrent.id} variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
                          <Typography variant="subtitle1" noWrap sx={{ flexGrow: 1, mr: 2 }}>
                            {torrent.name}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip 
                              label={`${formatProgress(torrent.progress)}%`} 
                              size="small" 
                              color="primary" 
                            />
                            <Tooltip title="Play">
                              <IconButton 
                                size="small" 
                                onClick={() => onPlayFile && onPlayFile(torrent.id, 0, torrent.name)}
                              >
                                <PlayIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={formatProgress(torrent.progress)} 
                          sx={{ mb: 1, height: 8, borderRadius: 4 }}
                        />
                        
                        <Box display="flex" justifyContent="between" alignItems="center">
                          <Typography variant="caption" color="textSecondary">
                            {formatBytes(torrent.size)} • {torrent.peers} peers
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ↓ {formatSpeed(torrent.download_speed)} • ↑ {formatSpeed(torrent.upload_speed)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                }
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Recent Activity & System Info */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Recent Activity */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>Recent Activity</Typography>
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                  No recent activity
                </Typography>
              ) : (
                <List dense>
                  {recentActivity.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ActivityItem activity={activity} />
                      {index < recentActivity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>

            {/* Quick Actions */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>Quick Actions</Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DownloadIcon />}
                  onClick={() => document.querySelector('[aria-label="add torrent"]')?.click()}
                >
                  Add Torrent
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<RefreshIcon />}
                  onClick={refreshTorrents}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} /> : 'Refresh All'}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SettingsIcon />}
                >
                  Settings
                </Button>
              </Stack>
            </Paper>

            {/* System Info */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" mb={2}>System Info</Typography>
              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="between">
                    <Typography variant="body2">Storage Used</Typography>
                    <Typography variant="body2">{formatBytes(stats.totalSize)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={75} 
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="between">
                    <Typography variant="body2">Server Status</Typography>
                    <Chip 
                      label={connected ? "Running" : "Offline"} 
                      size="small" 
                      color={connected ? "success" : "error"}
                    />
                  </Box>
                </Box>
                <Box>
                  <Box display="flex" justifyContent="between">
                    <Typography variant="body2">API Endpoint</Typography>
                    <Typography variant="caption" color="textSecondary">
                      localhost:5000
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;