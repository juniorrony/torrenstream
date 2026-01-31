import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Slide,
  useMediaQuery,
  useTheme,
  IconButton,
  Box
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import { useAuth } from '../../context/AuthContext';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AUTH_VIEWS = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password'
};

const AuthModal = ({ 
  open, 
  onClose, 
  initialView = AUTH_VIEWS.LOGIN,
  onLoginSuccess,
  onRegistrationSuccess 
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, user } = useAuth();
  
  const [currentView, setCurrentView] = useState(initialView);

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      onClose();
    }
  }, [isAuthenticated, user, onClose]);

  // Reset view when modal opens
  useEffect(() => {
    if (open) {
      setCurrentView(initialView);
    }
  }, [open, initialView]);

  const handleClose = () => {
    setCurrentView(AUTH_VIEWS.LOGIN);
    onClose();
  };

  const handleSwitchToRegister = () => {
    setCurrentView(AUTH_VIEWS.REGISTER);
  };

  const handleSwitchToLogin = () => {
    setCurrentView(AUTH_VIEWS.LOGIN);
  };

  const handleForgotPassword = () => {
    setCurrentView(AUTH_VIEWS.FORGOT_PASSWORD);
  };

  const handleLoginSuccess = (user) => {
    console.log('Login successful in modal:', user);
    onLoginSuccess?.(user);
    handleClose();
  };

  const handleRegistrationSuccess = (result) => {
    console.log('Registration successful in modal:', result);
    onRegistrationSuccess?.(result);
    // Don't close modal immediately - show success message first
    // The Register component handles showing success and providing "Go to Sign In" button
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
          overflow: 'hidden',
          position: 'relative'
        }
      }}
    >
      {/* Close Button */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1000
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          p: 0,
          '&::-webkit-scrollbar': {
            display: 'none'
          },
          scrollbarWidth: 'none'
        }}
      >
        {currentView === AUTH_VIEWS.LOGIN && (
          <Login
            onSwitchToRegister={handleSwitchToRegister}
            onForgotPassword={handleForgotPassword}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentView === AUTH_VIEWS.REGISTER && (
          <Register
            onSwitchToLogin={handleSwitchToLogin}
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        )}

        {currentView === AUTH_VIEWS.FORGOT_PASSWORD && (
          <ForgotPassword
            onBack={handleSwitchToLogin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;