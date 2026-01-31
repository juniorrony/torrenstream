import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container,
  Paper
} from '@mui/material';
import {
  Lock as LockIcon,
  Login as LoginIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import AuthModal from './AuthModal';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredPermission = null,
  requireEmailVerification = false,
  fallbackMessage = null 
}) => {
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    hasRole, 
    hasPermission,
    isEmailVerified 
  } = useAuth();
  
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Checking authentication...
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #FF5722 30%, #FF9800 90%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 20px rgba(255, 87, 34, 0.3)'
              }}
            >
              <LockIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>

            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Authentication Required
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {fallbackMessage || 'Please sign in to access this content.'}
            </Typography>

            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={() => setShowAuthModal(true)}
              sx={{
                py: 1.5,
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #1EAEDB 90%)',
                  boxShadow: '0 6px 25px rgba(33, 150, 243, 0.4)',
                },
              }}
            >
              Sign In
            </Button>
          </Paper>
        </Container>

        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Email verification required
  if (requireEmailVerification && !isEmailVerified) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Typography variant="h6" gutterBottom>
            Email Verification Required
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please verify your email address to access this content. 
            Check your inbox for a verification email.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              // TODO: Implement resend verification email
              console.log('Resend verification email');
            }}
            sx={{ mt: 1 }}
          >
            Resend Verification Email
          </Button>
        </Alert>
      </Container>
    );
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    const roleMessage = Array.isArray(requiredRole) 
      ? `one of: ${requiredRole.join(', ')}`
      : requiredRole;

    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          elevation={4}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)'
            }}
          >
            <WarningIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Insufficient Permissions
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You need {roleMessage} role to access this content.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Current role: <strong>{user?.role || 'None'}</strong>
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Check specific permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          elevation={4}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)'
            }}
          >
            <LockIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Access Denied
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You don't have the required permission to access this content.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Required permission: <strong>{requiredPermission}</strong>
          </Typography>
        </Paper>
      </Container>
    );
  }

  // All checks passed - render the protected content
  return children;
};

export default ProtectedRoute;