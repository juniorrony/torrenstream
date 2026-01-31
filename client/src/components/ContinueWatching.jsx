import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  LinearProgress,
  Chip,
  IconButton,
  Grid,
  Skeleton,
  Alert,
  Button,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  MoreVert as MoreIcon,
  Schedule as TimeIcon,
  Movie as MovieIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';
import watchProgressManager from '../utils/watchProgressManager';

const ContinueWatching = ({ onVideoSelect }) => {
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Load continue watching list
  const loadContinueWatching = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await watchProgressManager.getContinueWatching(10);
      setContinueWatching(data);
    } catch (error) {
      console.error('Error loading continue watching:', error);
      setError('Failed to load continue watching list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContinueWatching();
  }, []);

  // Handle video selection
  const handleVideoSelect = (item) => {
    if (onVideoSelect) {
      onVideoSelect(item.torrent_id, item.file_index, item.file_name);
    }
  };

  // Handle menu actions
  const handleMenuOpen = (event, item) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedItem(null);
  };

  const handleMarkCompleted = async () => {
    if (!selectedItem) return;

    try {
      await watchProgressManager.markCompleted(selectedItem.torrent_id, selectedItem.file_index);
      handleMenuClose();
      loadContinueWatching(); // Refresh list
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  };

  const handleDeleteProgress = async () => {
    if (!selectedItem) return;

    try {
      await watchProgressManager.deleteWatchProgress(selectedItem.torrent_id, selectedItem.file_index);
      handleMenuClose();
      loadContinueWatching(); // Refresh list
    } catch (error) {
      console.error('Error deleting progress:', error);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get video thumbnail placeholder
  const getVideoThumbnail = (fileName) => {
    // For now, return a gradient based on filename
    const hash = fileName ? fileName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0) : 0;
    
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Continue Watching
        </Typography>
        <Grid container spacing={2}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={140} />
                <CardContent>
                  <Skeleton variant="text" sx={{ fontSize: '1.25rem', mb: 1 }} />
                  <Skeleton variant="text" sx={{ fontSize: '0.875rem', mb: 1 }} />
                  <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Continue Watching
        </Typography>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={loadContinueWatching}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (continueWatching.length === 0) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Continue Watching
        </Typography>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <MovieIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No videos in progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start watching a video to see it here
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Box display="flex" justifyContent="between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Continue Watching
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadContinueWatching} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={2}>
        {continueWatching.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={`${item.torrent_id}_${item.file_index}`}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                }
              }}
            >
              <CardActionArea 
                onClick={() => handleVideoSelect(item)}
                sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                {/* Thumbnail */}
                <Box
                  sx={{
                    height: 140,
                    background: getVideoThumbnail(item.file_name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <PlayIcon sx={{ fontSize: 48, color: 'white', opacity: 0.8 }} />
                  
                  {/* Progress overlay */}
                  <LinearProgress
                    variant="determinate"
                    value={item.progress_percent}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 6,
                      bgcolor: 'rgba(0,0,0,0.3)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'primary.main'
                      }
                    }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  {/* File name */}
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {item.file_name}
                  </Typography>

                  {/* Torrent name */}
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.torrent_name}
                  </Typography>

                  {/* Progress info */}
                  <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                    <Chip 
                      size="small" 
                      label={item.progressText}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      icon={<TimeIcon />}
                      label={item.timeRemaining}
                      variant="outlined"
                    />
                  </Box>

                  {/* File size and last watched */}
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatFileSize(item.file_size)} • {item.lastWatchedFormatted}
                  </Typography>
                </CardContent>
              </CardActionArea>

              {/* Menu button */}
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, item)}
                  sx={{ 
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMarkCompleted}>
          <CompleteIcon sx={{ mr: 1 }} />
          Mark as Completed
        </MenuItem>
        <MenuItem onClick={handleDeleteProgress} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Remove from List
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ContinueWatching;