import React, { Suspense } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Container
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TorrentProvider } from './context/TorrentContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthGuard, { AdminGuard } from './components/auth/AuthGuard';
import AuthAwareNavigation from './components/navigation/AuthAwareNavigation';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./components/Dashboard.jsx'));
const TorrentList = React.lazy(() => import('./components/TorrentList.jsx'));
const VideoPlayer = React.lazy(() => import('./components/VideoPlayer.jsx'));
const TorrentDiscovery = React.lazy(() => import('./components/TorrentDiscovery.jsx'));
const UserProfile = React.lazy(() => import('./components/auth/UserProfile'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const LandingPage = React.lazy(() => import('./components/LandingPage'));

// Main App Content Component
function AppContent() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const { isAuthenticated, user, isAdmin } = useAuth();

  // Check URL for admin route
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin' && isAdmin) {
      setShowAdmin(true);
    }
  }, [isAdmin]);

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

  // Show admin dashboard if requested and user is admin
  if (showAdmin && isAdmin) {
    return (
      <TorrentProvider>
        <AdminRouter />
      </TorrentProvider>
    );
  }

  return (
    <TorrentProvider>
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <AppBar position="static" sx={{ mb: 3 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🧲 TorrentStream
            </Typography>
            
            {/* User Info / Auth Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isAuthenticated && user ? (
                <>
                  <Typography variant="body2" color="inherit">
                    Welcome, {user.displayName || user.username}!
                  </Typography>
                  <UserMenu />
                </>
              ) : (
                <Button
                  color="inherit"
                  startIcon={<LoginIcon />}
                  onClick={() => setAuthModalOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Sign In
                </Button>
              )}
            </Box>
          </Toolbar>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ bgcolor: 'primary.dark' }}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="📊 Dashboard" />
            <Tab label="🔍 Discover" />
            <Tab label="📥 My Torrents" />
          </Tabs>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl">
          {currentTab === 0 && (
            <Dashboard onPlayFile={handlePlayFile} />
          )}
          {currentTab === 1 && (
            <TorrentDiscovery 
              onAddTorrent={() => setCurrentTab(2)} // Switch to My Torrents after adding
              onNotification={showNotification} 
            />
          )}
          {currentTab === 2 && (
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

        {/* Authentication Modal */}
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(user) => {
            setNotification({
              open: true,
              message: `Welcome back, ${user.displayName || user.username}!`,
              severity: 'success'
            });
            setAuthModalOpen(false);
          }}
          onRegistrationSuccess={(result) => {
            setNotification({
              open: true,
              message: result.message || 'Registration successful! Please verify your email.',
              severity: 'success'
            });
          }}
        />
      </Box>
    </TorrentProvider>
  );
}

// Main App Component with Authentication Provider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;