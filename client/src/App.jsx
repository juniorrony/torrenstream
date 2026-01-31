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
const AdminRouter = React.lazy(() => import('./components/admin/AdminRouter'));
const LandingPage = React.lazy(() => import('./components/LandingPage'));

// Create theme with auth-aware styling
const createAppTheme = (darkMode = true) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#FF4081',
    },
    background: {
      default: darkMode ? '#121212' : '#f5f5f5',
      paper: darkMode ? '#1e1e1e' : '#ffffff',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          borderRadius: 12,
          boxShadow: darkMode 
            ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
            : '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          color: darkMode ? '#ffffff' : '#000000',
        },
      },
    },
  },
});

// Loading component for Suspense fallbacks
const LoadingSpinner = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '50vh' 
    }}
  >
    <CircularProgress />
  </Box>
);

// Main App Layout Component
const AppLayout = ({ children }) => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AuthAwareNavigation />
      <main>
        {children}
      </main>
    </Box>
  );
};

// Protected Dashboard Route
const ProtectedDashboard = () => {
  return (
    <AuthGuard>
      <TorrentProvider>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        </Container>
      </TorrentProvider>
    </AuthGuard>
  );
};

// Protected Library Route
const ProtectedLibrary = () => {
  const handleNotification = (message, type) => {
    // Simple console notification for now
    // TODO: Replace with proper toast/snackbar system
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  return (
    <AuthGuard>
      <TorrentProvider>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Suspense fallback={<LoadingSpinner />}>
            <TorrentList onNotification={handleNotification} />
          </Suspense>
        </Container>
      </TorrentProvider>
    </AuthGuard>
  );
};

// Protected Browse Route
const ProtectedBrowse = () => {
  const handleNotification = (message, type) => {
    // Simple console notification for now
    // TODO: Replace with proper toast/snackbar system
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  return (
    <AuthGuard>
      <TorrentProvider>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Suspense fallback={<LoadingSpinner />}>
            <TorrentDiscovery onNotification={handleNotification} />
          </Suspense>
        </Container>
      </TorrentProvider>
    </AuthGuard>
  );
};

// Protected Video Player Route
const ProtectedVideoPlayer = () => {
  return (
    <AuthGuard>
      <TorrentProvider>
        <Box sx={{ bgcolor: 'black', minHeight: '100vh' }}>
          <Suspense fallback={<LoadingSpinner />}>
            <VideoPlayer />
          </Suspense>
        </Box>
      </TorrentProvider>
    </AuthGuard>
  );
};

// Protected Profile Route
const ProtectedProfile = () => {
  return (
    <AuthGuard>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Suspense fallback={<LoadingSpinner />}>
          <UserProfile />
        </Suspense>
      </Container>
    </AuthGuard>
  );
};

// Protected Admin Routes
const ProtectedAdmin = () => {
  return (
    <AdminGuard>
      <Suspense fallback={<LoadingSpinner />}>
        <AdminRouter />
      </Suspense>
    </AdminGuard>
  );
};

// Public Landing Page
const PublicLanding = () => {
  return (
    <AuthGuard requireAuth={false}>
      <Container maxWidth="xl">
        <Suspense fallback={<LoadingSpinner />}>
          <LandingPage />
        </Suspense>
      </Container>
    </AuthGuard>
  );
};

function App() {
  const theme = createAppTheme(true); // TODO: Make this user preference based

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppLayout>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PublicLanding />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedDashboard />} />
                <Route path="/library" element={<ProtectedLibrary />} />
                <Route path="/browse" element={<ProtectedBrowse />} />
                <Route path="/watch/:torrentId" element={<ProtectedVideoPlayer />} />
                <Route path="/profile" element={<ProtectedProfile />} />
                
                {/* Admin Routes */}
                <Route path="/admin/*" element={<ProtectedAdmin />} />
                
                {/* Redirects */}
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                
                {/* Catch-all for 404 */}
                <Route path="*" element={
                  <Container sx={{ py: 3, textAlign: 'center' }}>
                    <h1>404 - Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                  </Container>
                } />
              </Routes>
            </Suspense>
          </AppLayout>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;