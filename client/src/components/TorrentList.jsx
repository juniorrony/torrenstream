import React, { useState, useMemo } from 'react';
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
  Tooltip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  Fab,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Drawer,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Pause as PauseIcon,
  PlayCircle as PlayCircleIcon,
  Stop as StopIcon,
  GetApp as GetAppIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Folder as FolderIcon,
  CloudDownload as CloudDownloadIcon,
  Settings as SettingsIcon,
  Close as CloseIcon
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
  const { torrents, loading, connected, removeTorrent, pauseTorrent, resumeTorrent, getTorrentDetails, refreshTorrents } = useTorrents();
  const [expandedTorrent, setExpandedTorrent] = useState(null);
  const [torrentFiles, setTorrentFiles] = useState({});
  const [loadingFiles, setLoadingFiles] = useState({});
  
  // Enhanced state for filtering and view options
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedTorrents, setSelectedTorrents] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [torrentDetailsOpen, setTorrentDetailsOpen] = useState(false);
  const [selectedTorrentDetails, setSelectedTorrentDetails] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [torrentToDelete, setTorrentToDelete] = useState(null);
  
  // Speed dial actions
  const speedDialActions = [
    { icon: <RefreshIcon />, name: 'Refresh', action: () => refreshTorrents() },
    { icon: <FilterIcon />, name: 'Filters', action: () => setFilterDrawerOpen(true) },
    { icon: <DeleteIcon />, name: 'Bulk Delete', action: () => setShowBulkActions(true) },
  ];

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

  // Enhanced functionality
  const handleViewTorrentDetails = async (torrent) => {
    setSelectedTorrentDetails(torrent);
    setTorrentDetailsOpen(true);
  };

  const handleBulkDelete = async () => {
    try {
      for (const torrentId of selectedTorrents) {
        await removeTorrent(torrentId, false); // Default to not delete files for bulk
      }
      setSelectedTorrents([]);
      setShowBulkActions(false);
      onNotification(`Deleted ${selectedTorrents.length} torrents (files kept)`, 'success');
    } catch (error) {
      onNotification('Failed to delete some torrents', 'error');
    }
  };

  const handleDeleteTorrent = (torrent) => {
    setTorrentToDelete(torrent);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (deleteFiles) => {
    try {
      await removeTorrent(torrentToDelete.id, deleteFiles);
      setDeleteDialogOpen(false);
      setTorrentToDelete(null);
      onNotification(
        `Torrent deleted ${deleteFiles ? '(including files)' : '(files kept)'}`, 
        'success'
      );
    } catch (error) {
      onNotification('Failed to delete torrent', 'error');
    }
  };

  const handlePauseTorrent = async (torrentId) => {
    try {
      await pauseTorrent(torrentId);
      onNotification('Torrent paused', 'success');
    } catch (error) {
      onNotification('Failed to pause torrent', 'error');
    }
  };

  const handleResumeTorrent = async (torrentId) => {
    try {
      await resumeTorrent(torrentId);
      onNotification('Torrent resumed', 'success');
    } catch (error) {
      onNotification('Failed to resume torrent', 'error');
    }
  };

  const handleSelectTorrent = (torrentId) => {
    setSelectedTorrents(prev => 
      prev.includes(torrentId) 
        ? prev.filter(id => id !== torrentId)
        : [...prev, torrentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTorrents.length === filteredAndSortedTorrents.length) {
      setSelectedTorrents([]);
    } else {
      setSelectedTorrents(filteredAndSortedTorrents.map(t => t.id));
    }
  };

  // Filter and sort torrents
  const filteredAndSortedTorrents = useMemo(() => {
    let filtered = torrents.filter(torrent => {
      const matchesSearch = torrent.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || torrent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'progress') {
        aValue = a.progress || 0;
        bValue = b.progress || 0;
      } else if (sortBy === 'size') {
        aValue = a.size || 0;
        bValue = b.size || 0;
      } else if (sortBy === 'created_at') {
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [torrents, searchTerm, statusFilter, sortBy, sortOrder]);

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
      {/* Enhanced Header with Search and Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
          <Typography variant="h5">
            My Torrents ({filteredAndSortedTorrents.length}/{torrents.length})
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={connected ? 'Connected' : 'Disconnected'} 
              color={connected ? 'success' : 'error'}
              size="small"
            />
            <ButtonGroup size="small">
              <Button 
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('cards')}
                startIcon={<ViewModuleIcon />}
              >
                Cards
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
                startIcon={<ViewListIcon />}
              >
                Table
              </Button>
            </ButtonGroup>
          </Box>
        </Box>

        {/* Search and Filter Bar */}
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search torrents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="downloading">Downloading</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="seeding">Seeding</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="created_at">Date Added</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="size">Size</MenuItem>
              <MenuItem value="progress">Progress</MenuItem>
            </Select>
          </FormControl>

          <ButtonGroup size="small">
            <Button 
              variant={sortOrder === 'asc' ? 'contained' : 'outlined'}
              onClick={() => setSortOrder('asc')}
            >
              Asc
            </Button>
            <Button 
              variant={sortOrder === 'desc' ? 'contained' : 'outlined'}
              onClick={() => setSortOrder('desc')}
            >
              Desc
            </Button>
          </ButtonGroup>

          {selectedTorrents.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowBulkActions(true)}
            >
              Delete Selected ({selectedTorrents.length})
            </Button>
          )}
        </Box>
      </Paper>

      {/* Content Area */}
      {viewMode === 'cards' ? (
        <Grid container spacing={2}>
          {filteredAndSortedTorrents.map((torrent) => (
            <Grid item xs={12} md={6} lg={4} key={torrent.id}>
              <Card 
                sx={{ 
                  border: selectedTorrents.includes(torrent.id) ? 2 : 1,
                  borderColor: selectedTorrents.includes(torrent.id) ? 'primary.main' : 'divider'
                }}
              >
                <CardContent>
                  {/* Card Header with Checkbox */}
                  <Box display="flex" alignItems="flex-start" mb={1}>
                    <Checkbox
                      checked={selectedTorrents.includes(torrent.id)}
                      onChange={() => handleSelectTorrent(torrent.id)}
                      size="small"
                    />
                    <Box flexGrow={1}>
                      <Typography variant="h6" noWrap title={torrent.name}>
                        {torrent.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <Chip 
                          label={getStatusLabel(torrent.status)}
                          size="small"
                          sx={{ 
                            backgroundColor: getStatusColor(torrent.status),
                            color: 'white'
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(torrent.size || 0)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Tooltip title="More Info">
                        <IconButton size="small" onClick={() => handleViewTorrentDetails(torrent)}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                      {torrent.status === 'downloading' && (
                        <Tooltip title="Pause">
                          <IconButton size="small" onClick={() => handlePauseTorrent(torrent.id)}>
                            <PauseIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {torrent.status === 'paused' && (
                        <Tooltip title="Resume">
                          <IconButton size="small" color="primary" onClick={() => handleResumeTorrent(torrent.id)}>
                            <PlayCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteTorrent(torrent)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  {torrent.status === 'downloading' && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={formatProgress(torrent.progress || 0)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Box display="flex" justifyContent="between" mt={1}>
                        <Typography variant="body2" color="text.secondary">
                          {formatProgress(torrent.progress || 0)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ↓ {formatSpeed(torrent.download_speed || 0)} • {torrent.peers || 0} peers
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Box display="flex" gap={1} justifyContent="center">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayIcon />}
                      onClick={() => handleExpandTorrent(torrent.id)}
                      disabled={torrent.status === 'pending'}
                    >
                      Files
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FolderIcon />}
                      onClick={() => handleViewTorrentDetails(torrent)}
                    >
                      Details
                    </Button>
                  </Box>

                  {/* File List */}
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
                                disabled={!isStreamable(file.name) || (torrent.status !== 'completed' && torrent.status !== 'seeding' && torrent.status !== 'downloading')}
                              >
                                <ListItemIcon>
                                  {isStreamable(file.name) ? <PlayIcon color="primary" /> : getFileTypeIcon(file.name)}
                                </ListItemIcon>
                                <ListItemText
                                  primary={file.name}
                                  secondary={`${formatBytes(file.size)} ${isStreamable(file.name) ? '• Click to stream' : ''}`}
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
      ) : (
        /* Table View */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Checkbox
                    indeterminate={selectedTorrents.length > 0 && selectedTorrents.length < filteredAndSortedTorrents.length}
                    checked={selectedTorrents.length === filteredAndSortedTorrents.length && filteredAndSortedTorrents.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortOrder : 'asc'}
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('name');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Speed</TableCell>
                <TableCell>Peers</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedTorrents.map((torrent) => (
                <TableRow 
                  key={torrent.id}
                  selected={selectedTorrents.includes(torrent.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedTorrents.includes(torrent.id)}
                      onChange={() => handleSelectTorrent(torrent.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {torrent.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(torrent.status)}
                      size="small"
                      sx={{ 
                        backgroundColor: getStatusColor(torrent.status),
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatBytes(torrent.size || 0)}</TableCell>
                  <TableCell>
                    {torrent.status === 'downloading' ? (
                      <Box sx={{ minWidth: 100 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={formatProgress(torrent.progress || 0)}
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption">
                          {formatProgress(torrent.progress || 0)}%
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">
                        {(torrent.status === 'completed' || torrent.status === 'seeding') ? '100%' : '-'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      ↓ {formatSpeed(torrent.download_speed || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>{torrent.peers || 0}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Stream">
                        <IconButton 
                          size="small" 
                          onClick={() => handleExpandTorrent(torrent.id)}
                          disabled={torrent.status === 'pending'}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Details">
                        <IconButton size="small" onClick={() => handleViewTorrentDetails(torrent)}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                      {torrent.status === 'downloading' && (
                        <Tooltip title="Pause">
                          <IconButton size="small" onClick={() => handlePauseTorrent(torrent.id)}>
                            <PauseIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {torrent.status === 'paused' && (
                        <Tooltip title="Resume">
                          <IconButton size="small" color="primary" onClick={() => handleResumeTorrent(torrent.id)}>
                            <PlayCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteTorrent(torrent)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.action}
          />
        ))}
      </SpeedDial>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActions} onClose={() => setShowBulkActions(false)}>
        <DialogTitle>Bulk Delete Torrents</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedTorrents.length} selected torrents?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkActions(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Delete {selectedTorrents.length} Torrents
          </Button>
        </DialogActions>
      </Dialog>

      {/* Torrent Details Dialog */}
      <Dialog 
        open={torrentDetailsOpen} 
        onClose={() => setTorrentDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Torrent Details
          <IconButton
            sx={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => setTorrentDetailsOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedTorrentDetails && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTorrentDetails.name}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status:</Typography>
                  <Chip 
                    label={getStatusLabel(selectedTorrentDetails.status)}
                    size="small"
                    sx={{ 
                      backgroundColor: getStatusColor(selectedTorrentDetails.status),
                      color: 'white'
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Size:</Typography>
                  <Typography variant="body1">{formatBytes(selectedTorrentDetails.size || 0)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Progress:</Typography>
                  <Typography variant="body1">
                    {formatProgress(selectedTorrentDetails.progress || 0)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Peers:</Typography>
                  <Typography variant="body1">{selectedTorrentDetails.peers || 0}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Info Hash:</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {selectedTorrentDetails.info_hash || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Delete Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            Delete Torrent
          </Box>
        </DialogTitle>
        <DialogContent>
          {torrentToDelete && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete this torrent?
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                "{torrentToDelete.name}"
              </Typography>
              
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                Choose whether to keep the downloaded files or delete everything:
              </Alert>

              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleConfirmDelete(false)}
                  startIcon={<CloudDownloadIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', p: 2 }}
                >
                  <Box textAlign="left">
                    <Typography variant="body2" fontWeight="bold">
                      Remove torrent only (keep files)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Downloaded files will remain in your downloads folder
                    </Typography>
                  </Box>
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleConfirmDelete(true)}
                  startIcon={<DeleteIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', p: 2 }}
                >
                  <Box textAlign="left">
                    <Typography variant="body2" fontWeight="bold">
                      Remove torrent and delete files
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ⚠️ This will permanently delete all downloaded files
                    </Typography>
                  </Box>
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TorrentList;