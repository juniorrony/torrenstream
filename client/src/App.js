import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Fab,
  Dialog,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TorrentList from './components/TorrentList';
import AddTorrentDialog from './components/AddTorrentDialog';
import VideoPlayer from './components/VideoPlayer';
import TorrentDiscovery from './components/TorrentDiscovery';
import { TorrentProvider } from './context/TorrentContext';

function App() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const handlePlayFile = (torrentId, fileIndex, fileName) => {
    setSelectedFile({
      torrentId,
      fileIndex,
      fileName
    });
    setPlayerOpen(true);
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <TorrentProvider>
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <AppBar position="static" sx={{ mb: 3 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🧲 TorrentStream
            </Typography>
            <Typography variant="subtitle2" color="inherit">
              Stream torrents instantly
            </Typography>
          </Toolbar>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ bgcolor: 'primary.dark' }}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="🔍 Discover" />
            <Tab label="📥 My Torrents" />
          </Tabs>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg">
          {currentTab === 0 && (
            <TorrentDiscovery 
              onAddTorrent={() => setCurrentTab(1)} // Switch to My Torrents after adding
              onNotification={showNotification} 
            />
          )}
          {currentTab === 1 && (
            <TorrentList onPlayFile={handlePlayFile} onNotification={showNotification} />
          )}
        </Container>

        {/* Add Torrent FAB */}
        <Fab
          color="primary"
          aria-label="add torrent"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => setAddDialogOpen(true)}
        >
          <AddIcon />
        </Fab>

        {/* Add Torrent Dialog */}
        <AddTorrentDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onNotification={showNotification}
        />

        {/* Video Player Dialog */}
        <Dialog
          open={playerOpen}
          onClose={() => setPlayerOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: 'black',
              minHeight: '60vh'
            }
          }}
        >
          {selectedFile && (
            <VideoPlayer
              torrentId={selectedFile.torrentId}
              fileIndex={selectedFile.fileIndex}
              fileName={selectedFile.fileName}
              onClose={() => setPlayerOpen(false)}
            />
          )}
        </Dialog>

        {/* Notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={closeNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert onClose={closeNotification} severity={notification.severity} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </TorrentProvider>
  );
}

export default App;