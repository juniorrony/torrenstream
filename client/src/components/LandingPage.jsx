import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  Movie as MovieIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  PlayCircle as PlayIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import AuthModal from './auth/AuthModal';

const FeatureCard = ({ icon, title, description }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <CardContent sx={{ p: 3, textAlign: 'center' }}>
        <Box sx={{ mb: 2, color: 'primary.main' }}>
          {icon}
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const LandingPage = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (isAuthenticated) {
    // Redirect authenticated users to dashboard
    window.location.href = '/dashboard';
    return null;
  }

  const features = [
    {
      icon: <MovieIcon sx={{ fontSize: 48 }} />,
      title: 'Vast Library',
      description: 'Access thousands of movies and TV shows through torrent streaming'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48 }} />,
      title: 'Instant Streaming',
      description: 'Start watching immediately while content downloads in the background'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48 }} />,
      title: 'Secure & Private',
      description: 'Advanced encryption and privacy features to protect your browsing'
    },
    {
      icon: <CloudIcon sx={{ fontSize: 48 }} />,
      title: 'Cloud Storage',
      description: 'Store your favorite content in the cloud for easy access anywhere'
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          py: { xs: 8, md: 12 },
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <MovieIcon sx={{ fontSize: 80, color: 'primary.main' }} />
          </Box>
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            TorrentStream
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            gutterBottom
            sx={{ mb: 4, fontWeight: 300 }}
          >
            Stream any movie or TV show instantly with the power of torrents
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayIcon />}
              onClick={() => setAuthModalOpen(true)}
              sx={{ 
                px: 4, 
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem'
              }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<DownloadIcon />}
              sx={{ 
                px: 4, 
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem'
              }}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          textAlign="center" 
          gutterBottom
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Why Choose TorrentStream?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <FeatureCard {...feature} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            component="h2" 
            textAlign="center" 
            gutterBottom
            sx={{ mb: 6, fontWeight: 600 }}
          >
            How It Works
          </Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3
                }}
              >
                <Chip 
                  label="1" 
                  color="primary" 
                  sx={{ mb: 2, fontSize: '1.2rem', width: 40, height: 40 }} 
                />
                <Typography variant="h6" gutterBottom>
                  Sign Up
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your free account and join our streaming community
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3
                }}
              >
                <Chip 
                  label="2" 
                  color="primary" 
                  sx={{ mb: 2, fontSize: '1.2rem', width: 40, height: 40 }} 
                />
                <Typography variant="h6" gutterBottom>
                  Search & Discover
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse our vast library or search for specific movies and shows
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3
                }}
              >
                <Chip 
                  label="3" 
                  color="primary" 
                  sx={{ mb: 2, fontSize: '1.2rem', width: 40, height: 40 }} 
                />
                <Typography variant="h6" gutterBottom>
                  Stream Instantly
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click play and start watching while the content downloads
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          py: 8,
          textAlign: 'center',
          color: 'white'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
            Ready to Start Streaming?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of users who are already enjoying unlimited streaming
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayIcon />}
            onClick={() => setAuthModalOpen(true)}
            sx={{ 
              bgcolor: 'white',
              color: 'primary.main',
              px: 4, 
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': {
                bgcolor: alpha('#ffffff', 0.9)
              }
            }}
          >
            Start Free Today
          </Button>
        </Container>
      </Box>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </Box>
  );
};

export default LandingPage;