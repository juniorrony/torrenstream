import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  IconButton,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTorrents } from '../context/TorrentContext';
import { 
  formatBytes, 
  formatSpeed, 
  formatProgress, 
  getFileTypeIcon, 
  isStreamable,
  getStatusColor,
  getStatusLabel
} from '../utils/helpers';

const TorrentList = ({ onPlayFile, onNotification }) => {
  const { torrents, loading, connected, removeTorrent, getTorrentDetails, refreshTorrents } = useTorrents();
  const [expandedTorrent, setExpandedTorrent] = useState(null);
  const [torrentFiles, setTorrentFiles] = useState({});
  const [loadingFiles, setLoadingFiles] = useState({});

  const handleExpandTorrent = async (torrentId) => {
    if (expandedTorrent === torrentId) {
      setExpandedTorrent(null);
      return;
    }

    setExpandedTorrent(torrentId);

    if (!torrentFiles[torrentId]) {
      setLoadingFiles({ ...loadingFiles, [torrentId]: true });
      try {
        const details = await getTorrentDetails(torrentId);
        setTorrentFiles({ ...torrentFiles, [torrentId]: details.files || [] });
      } catch (error) {
        console.error('Error loading torrent files:', error);
        onNotification('Failed to load torrent files', 'error');
      } finally {
        setLoadingFiles({ ...loadingFiles, [torrentId]: false });
      }
    }
  };

  const handleRemoveTorrent = async (torrentId) => {
    try {
      console.log('Attempting to remove torrent:', torrentId);
      await removeTorrent(torrentId);
      console.log('Torrent removed successfully:', torrentId);
      onNotification('Torrent removed successfully', 'success');
    } catch (error) {
      console.error('Error removing torrent:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to remove torrent';
      onNotification(`Failed to remove torrent: ${errorMessage}`, 'error');
    }
  };

  const handlePlayFile = (torrentId, fileIndex, fileName) => {
    onPlayFile(torrentId, fileIndex, fileName);
  };

  if (loading && torrents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (torrents.length === 0 && !loading) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          No torrents added yet
        </Typography>
        <Typography>
          Click the + button to add your first torrent via magnet link.
        </Typography>
      </Alert>
    );
  }

  if (loading && torrents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading torrents...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Status indicator */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom>
          My Torrents ({torrents.length})
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip 
            label={connected ? 'Connected' : 'Disconnected'} 
            color={connected ? 'success' : 'error'}
            size="small"
          />
          <Tooltip title="Refresh">
            <IconButton onClick={refreshTorrents} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Torrent cards */}
      <Grid container spacing={2}>
        {torrents.map((torrent) => (
          <Grid item xs={12} key={torrent.id}>
            <Card>
              <CardContent>
                {/* Torrent header */}
                <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
                  <Typography variant="h6" noWrap sx={{ flexGrow: 1, mr: 2 }}>
                    {torrent.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={getStatusLabel(torrent.status)}
                      size="small"
                      sx={{ 
                        backgroundColor: getStatusColor(torrent.status),
                        color: 'white'
                      }}
                    />
                    <IconButton
                      onClick={() => handleRemoveTorrent(torrent.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Progress bar */}
                {torrent.status === 'downloading' && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={formatProgress(torrent.progress || 0)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box display="flex" justifyContent="between" mt={1}>
                      <Typography variant="body2" color="text.secondary">
                        {formatProgress(torrent.progress || 0)}% complete
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ↓ {formatSpeed(torrent.download_speed || 0)} • 
                        ↑ {formatSpeed(torrent.upload_speed || 0)} • 
                        {torrent.peers || 0} peers
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Torrent info */}
                <Box display="flex" justifyContent="between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Size: {formatBytes(torrent.size || 0)}
                  </Typography>
                  <IconButton
                    onClick={() => handleExpandTorrent(torrent.id)}
                    disabled={torrent.status === 'pending'}
                  >
                    {expandedTorrent === torrent.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                {/* File list */}
                <Collapse in={expandedTorrent === torrent.id} timeout="auto">
                  <Box mt={2}>
                    {loadingFiles[torrent.id] ? (
                      <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <List dense>
                        {(torrentFiles[torrent.id] || []).map((file, index) => (
                          <ListItem key={index} disablePadding>
                            <ListItemButton
                              onClick={() => isStreamable(file.name) ? handlePlayFile(torrent.id, file.file_index, file.name) : null}
                              disabled={!isStreamable(file.name) || (torrent.status !== 'completed' && torrent.status !== 'downloading')}
                            >
                              <ListItemIcon>
                                {isStreamable(file.name) ? <PlayIcon /> : getFileTypeIcon(file.name)}
                              </ListItemIcon>
                              <ListItemText
                                primary={file.name}
                                secondary={`${formatBytes(file.size)} ${isStreamable(file.name) ? `• Streamable ${torrent.status === 'downloading' ? '(downloading)' : ''}` : ''}`}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                        {(torrentFiles[torrent.id] || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" align="center" py={2}>
                            No files available
                          </Typography>
                        )}
                      </List>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TorrentList;