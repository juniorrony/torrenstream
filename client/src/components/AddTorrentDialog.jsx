import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTorrents } from '../context/TorrentContext';
import { isValidMagnetLink } from '../utils/helpers';

const AddTorrentDialog = ({ open, onClose, onNotification }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  const [magnetLink, setMagnetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addTorrent } = useTorrents();

  // Check if user can add torrents
  const canAddTorrents = isAuthenticated && (hasPermission('torrents.add') || hasPermission('torrents.manage'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canAddTorrents) {
      setError('You do not have permission to add torrents');
      return;
    }
    
    if (!magnetLink.trim()) {
      setError('Please enter a magnet link');
      return;
    }

    if (!isValidMagnetLink(magnetLink)) {
      setError('Please enter a valid magnet link');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await addTorrent(magnetLink);
      console.log('Torrent add result:', result);
      onNotification(`Torrent added successfully! ID: ${result.torrentId}`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error adding torrent:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add torrent';
      setError(errorMessage);
      onNotification(`Failed to add torrent: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMagnetLink('');
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add New Torrent
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Magnet Link"
              placeholder="magnet:?xt=urn:btih:..."
              value={magnetLink}
              onChange={(e) => setMagnetLink(e.target.value)}
              error={!!error}
              helperText={error || 'Paste your magnet link here'}
              multiline
              rows={3}
              disabled={loading}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info">
            <strong>Tip:</strong> You can find magnet links on torrent sites. 
            Look for the magnet icon or "magnet link" button.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !magnetLink.trim()}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Adding...' : 'Add Torrent'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddTorrentDialog;