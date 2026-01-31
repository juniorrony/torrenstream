import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper,
  Alert 
} from '@mui/material';

// Loading component for auth checks
const AuthLoadingScreen = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      gap: 2
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="h6" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// Unauthorized access component
const UnauthorizedAccess = ({ requiredRole, requiredPermission }) => (
  <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
    <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2">
          {requiredRole ? (
            `You need ${requiredRole} role to access this page.`
          ) : requiredPermission ? (
            `You need "${requiredPermission}" permission to access this page.`
          ) : (
            'You don\'t have permission to access this page.'
          )}
        </Typography>
      </Alert>
      <Typography variant="body2" color="text.secondary">
        Please contact an administrator if you believe this is an error.
      </Typography>
    </Paper>
  </Box>
);

// Main AuthGuard component
const AuthGuard = ({ 
  children, 
  requireAuth = true, 
  requiredRole = null, 
  requiredPermission = null,
  redirectTo = '/login',
  fallback = null 
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    hasRole, 
    hasPermission, 
    user 
  } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // Route doesn't require authentication
  if (!requireAuth) {
    return children;
  }

  // User not authenticated but authentication required
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return <UnauthorizedAccess requiredRole={requiredRole} />;
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <UnauthorizedAccess requiredPermission={requiredPermission} />;
  }

  // All checks passed
  return children;
};

// Higher-order component for auth protection
export const withAuthGuard = (
  Component, 
  { requireAuth = true, requiredRole = null, requiredPermission = null } = {}
) => {
  return function AuthGuardedComponent(props) {
    return (
      <AuthGuard
        requireAuth={requireAuth}
        requiredRole={requiredRole}
        requiredPermission={requiredPermission}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
};

// Specific guards for common use cases
export const AdminGuard = ({ children }) => (
  <AuthGuard requiredRole="admin">
    {children}
  </AuthGuard>
);

export const ModeratorGuard = ({ children }) => (
  <AuthGuard requiredPermission="moderate.content">
    {children}
  </AuthGuard>
);

export const PremiumGuard = ({ children }) => (
  <AuthGuard requiredRole="premium">
    {children}
  </AuthGuard>
);

export default AuthGuard;