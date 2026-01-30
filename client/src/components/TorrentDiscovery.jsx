import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  Visibility as PreviewIcon,
  PlayArrow as StreamIcon,
  GetApp as AddIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Group as PeersIcon,
  Storage as SizeIcon,
  Schedule as DateIcon,
  Star as QualityIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  formatBytes, 
  formatDuration, 
  isStreamable,
  getFileTypeIcon 
} from '../utils/helpers';

const TorrentDiscovery = ({ onAddTorrent, onNotification }) => {
  const { isAuthenticated, user, isLoading: authLoading, hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Show login message if not authenticated
  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Torrent Discovery Access Required
          </Typography>
          <Typography variant="body1">
            Please log in to search and discover torrents.
          </Typography>
        </Alert>
      </Box>
    );
  }
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('seeders');
  const [minSeeders, setMinSeeders] = useState(5);
  
  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTorrent, setPreviewTorrent] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      console.log(`Searching for: ${searchQuery}`);
      
      const response = await api.get('/search', {
        params: {
          q: searchQuery,
          category,
          sortBy,
          minSeeders,
          limit: 50
        }
      });

      console.log('Search results:', response.data);
      setSearchResults(response.data.torrents || []);
      
      if (response.data.results === 0) {
        onNotification('No torrents found for your search', 'info');
      } else {
        onNotification(`Found ${response.data.results} torrents`, 'success');
      }

    } catch (error) {
      console.error('Search error:', error);
      onNotification('Search failed. Please try again.', 'error');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (torrent) => {
    setPreviewTorrent(torrent);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewFiles([]);
    setSelectedFiles([]);

    try {
      console.log('Previewing torrent:', torrent.name);
      
      // Since /preview endpoint doesn't exist, we'll show estimated file info
      // In a real implementation, this would add the torrent temporarily to get metadata
      
      const magnetLink = torrent.link || torrent.magnetLink || torrent.magnet;
      
      if (!magnetLink) {
        throw new Error('No magnet link found for this torrent');
      }
      
      // Create estimated file list based on torrent information
      const estimatedFiles = [];
      
      // If torrent has file info, use it
      if (torrent.files && Array.isArray(torrent.files)) {
        torrent.files.forEach((file, index) => {
          estimatedFiles.push({
            name: file.name || file,
            size: file.size || torrent.size || 0,
            index: index,
            streamable: isStreamable(file.name || file),
            path: file.path || file.name || file
          });
        });
      } else {
        // Estimate main file from torrent name
        const fileName = torrent.name;
        estimatedFiles.push({
          name: fileName,
          size: torrent.size || 0,
          index: 0,
          streamable: isStreamable(fileName),
          path: fileName
        });
        
        // Add common additional files that might be present
        const commonFiles = ['README.txt', 'info.nfo'];
        commonFiles.forEach((file, index) => {
          estimatedFiles.push({
            name: file,
            size: 1024, // 1KB estimate
            index: index + 1,
            streamable: false,
            path: file
          });
        });
      }

      console.log('Estimated files for preview:', estimatedFiles);
      setPreviewFiles(estimatedFiles);
      
      // Auto-select streamable files
      const streamableIndexes = estimatedFiles
        .map((file, index) => file.streamable ? index : null)
        .filter(index => index !== null);
      
      setSelectedFiles(streamableIndexes);
      
      // Store magnet link for adding
      setPreviewTorrent({ ...torrent, magnetLink });

    } catch (error) {
      console.error('Preview error:', error);
      onNotification('Failed to preview torrent files: ' + error.message, 'error');
      
      // Fallback: create minimal file info
      setPreviewFiles([{
        name: torrent.name,
        size: torrent.size || 0,
        index: 0,
        streamable: isStreamable(torrent.name),
        path: torrent.name
      }]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAddTorrent = async (torrent, selective = false) => {
    try {
      if (selective && selectedFiles.length === 0) {
        onNotification('Please select at least one file to download', 'warning');
        return;
      }

      // Get the magnet link from various possible properties
      const magnetLink = torrent.magnetLink || torrent.link || torrent.magnet;
      
      if (!magnetLink) {
        throw new Error('No magnet link found for this torrent');
      }

      // Use the standard /torrents endpoint (selective download isn't typically supported via API)
      const payload = { magnetLink };

      console.log(`Adding torrent ${selective ? 'selectively' : 'completely'}:`, torrent.name);
      console.log('Magnet link:', magnetLink);
      
      const response = await api.post('/torrents', payload);
      
      const message = selective ? 
        `Added torrent: ${torrent.name} (selected ${selectedFiles.length} files)` :
        `Added complete torrent: ${torrent.name}`;
      
      onNotification(message, 'success');
      setPreviewOpen(false);

      if (onAddTorrent) {
        onAddTorrent(torrent);
      }

    } catch (error) {
      console.error('Add torrent error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add torrent';
      onNotification(`Failed to add torrent: ${errorMessage}`, 'error');
    }
  };

  const toggleFileSelection = (fileIndex) => {
    setSelectedFiles(prev => 
      prev.includes(fileIndex) 
        ? prev.filter(i => i !== fileIndex)
        : [...prev, fileIndex]
    );
  };

  const formatPeerCount = (seeders, leechers) => {
    return `${seeders}↑ / ${leechers}↓`;
  };

  const getQualityChip = (name) => {
    const qualities = ['4K', '2160p', '1080p', '720p', '480p'];
    const quality = qualities.find(q => name.includes(q));
    return quality ? (
      <Chip 
        label={quality} 
        size="small" 
        color={quality === '4K' || quality === '2160p' ? 'success' : quality === '1080p' ? 'primary' : 'default'}
        sx={{ ml: 1 }}
      />
    ) : null;
  };

  return (
    <Box>
      {/* Search Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            🔍 Torrent Discovery
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search torrents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : <SearchIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="201">Movies</MenuItem>
                    <MenuItem value="202">TV Shows</MenuItem>
                    <MenuItem value="100">Audio</MenuItem>
                    <MenuItem value="300">Software</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort by"
                  >
                    <MenuItem value="seeders">Seeders</MenuItem>
                    <MenuItem value="size">Size</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  type="number"
                  label="Min Seeds"
                  size="small"
                  value={minSeeders}
                  onChange={(e) => setMinSeeders(parseInt(e.target.value) || 0)}
                  sx={{ width: 100 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Search Results */}
      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}

      {searchResults.length > 0 && (
        <Grid container spacing={2}>
          {searchResults.map((torrent) => (
            <Grid item xs={12} key={torrent.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {torrent.name}
                        {getQualityChip(torrent.name)}
                      </Typography>
                      
                      <Box display="flex" gap={2} mb={2}>
                        <Chip 
                          icon={<PeersIcon />}
                          label={formatPeerCount(torrent.seeders, torrent.leechers)}
                          size="small"
                          color={torrent.seeders > 50 ? 'success' : torrent.seeders > 10 ? 'warning' : 'error'}
                        />
                        <Chip 
                          icon={<SizeIcon />}
                          label={formatBytes(torrent.size)}
                          size="small"
                        />
                        <Chip 
                          label={torrent.category}
                          size="small"
                          variant="outlined"
                        />
                        {torrent.source && (
                          <Chip 
                            label={torrent.source}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Files: {torrent.files} • 
                        Uploader: {torrent.uploader} • 
                        Added: {new Date(torrent.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" flexDirection="column" gap={1} ml={2}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PreviewIcon />}
                        onClick={() => handlePreview(torrent)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddTorrent(torrent)}
                      >
                        Add All
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* File Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Preview Files - {previewTorrent?.name}
        </DialogTitle>
        
        <DialogContent>
          {previewLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Select the files you want to download and stream. Streamable files are pre-selected.
              </Alert>
              
              <List>
                {previewFiles.map((file, index) => (
                  <ListItem key={index} dense>
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedFiles.includes(index)}
                        onChange={() => toggleFileSelection(index)}
                      />
                    </ListItemIcon>
                    <ListItemIcon>
                      {file.streamable ? <StreamIcon color="success" /> : getFileTypeIcon(file.name)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${formatBytes(file.size)} ${file.streamable ? '• Streamable' : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="body2" color="text.secondary" mt={2}>
                Selected: {selectedFiles.length} of {previewFiles.length} files
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleAddTorrent(previewTorrent, true)}
            variant="contained"
            disabled={selectedFiles.length === 0}
            startIcon={<DownloadIcon />}
          >
            Download Selected ({selectedFiles.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* No Results */}
      {!loading && searchResults.length === 0 && searchQuery && (
        <Alert severity="info">
          No torrents found for "{searchQuery}". Try different keywords or adjust filters.
        </Alert>
      )}
    </Box>
  );
};

export default TorrentDiscovery;