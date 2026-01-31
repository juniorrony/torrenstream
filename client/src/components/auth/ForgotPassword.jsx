import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
  Fade,
  Container
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as BackIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const ForgotPassword = ({ onBack }) => {
  const { forgotPassword, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    clearError();
    
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Forgot password error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  // Success view
  if (success) {
    return (
      <Container maxWidth="sm">
        <Fade in timeout={600}>
          <Paper
            elevation={8}
            sx={{
              p: 4,
              mt: 8,
              borderRadius: 3,
              textAlign: 'center',
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
                  : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
            }}
          >
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Email Sent!
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              If an account exists with <strong>{email}</strong>, you'll receive a password reset link shortly.
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
              Please check your email inbox and spam folder.
            </Typography>
            <Button
              variant="outlined"
              onClick={onBack}
              startIcon={<BackIcon />}
              sx={{
                mt: 2,
                py: 1.5,
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              Back to Sign In
            </Button>
          </Paper>
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Fade in timeout={600}>
        <Paper
          elevation={8}
          sx={{
            p: 4,
            mt: 8,
            borderRadius: 3,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Back Button */}
          <Button
            startIcon={<BackIcon />}
            onClick={onBack}
            sx={{
              mb: 2,
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            Back to Sign In
          </Button>

          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 2
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)'
                }}
              >
                <EmailIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
            </Box>
            
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Forgot Password?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your email address and we'll send you a link to reset your password
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Fade in>
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email address"
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting || !email.trim()}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #F57C00 30%, #FF8F00 90%)',
                  boxShadow: '0 6px 25px rgba(255, 152, 0, 0.4)',
                },
                '&:disabled': {
                  background: 'rgba(255, 152, 0, 0.3)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
              }}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon />
                )
              }
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Box>

          {/* Footer */}
          <Box textAlign="center" mt={4}>
            <Typography variant="body2" color="text.secondary">
              Remember your password?{' '}
              <Button
                variant="text"
                onClick={onBack}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  minWidth: 'auto',
                  p: 0,
                  verticalAlign: 'baseline',
                }}
              >
                Sign In
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

export default ForgotPassword;