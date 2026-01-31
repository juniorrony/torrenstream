import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Replay as RestartIcon,
  Close as CloseIcon,
  Schedule as TimeIcon,
  Movie as MovieIcon
} from '@mui/icons-material';

const ResumeDialog = ({ 
  open, 
  onClose, 
  onResume, 
  onRestart, 
  progress, 
  fileName 
}) => {
  if (!progress) return null;

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const progressPercent = (progress.current_time / progress.duration) * 100;
  const timeRemaining = progress.duration - progress.current_time;
  const lastWatched = new Date(progress.last_watched || progress.lastUpdated);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="between">
          <Box display="flex" alignItems="center" gap={1}>
            <MovieIcon color="primary" />
            <Typography variant="h6" component="div">
              Resume Video?
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* File Name */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
          {fileName || progress.file_name || 'Unknown File'}
        </Typography>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" color="primary" fontWeight="500">
              {Math.round(progressPercent)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: 'primary.main'
              }
            }}
          />
        </Box>

        {/* Time Information */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <Chip
            icon={<PlayIcon />}
            label={`Resume at ${formatTime(progress.current_time)}`}
            variant="outlined"
            color="primary"
          />
          <Chip
            icon={<TimeIcon />}
            label={`${formatTime(timeRemaining)} remaining`}
            variant="outlined"
            color="secondary"
          />
        </Box>

        {/* Last Watched */}
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Last watched: {lastWatched.toLocaleDateString()} at {lastWatched.toLocaleTimeString()}
        </Typography>

        {/* Options Description */}
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            You can resume where you left off or start from the beginning. Your progress will be automatically saved as you watch.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onRestart}
          variant="outlined"
          startIcon={<RestartIcon />}
          sx={{ minWidth: 120 }}
        >
          Start Over
        </Button>
        <Button
          onClick={onResume}
          variant="contained"
          startIcon={<PlayIcon />}
          sx={{ minWidth: 120 }}
          autoFocus
        >
          Resume
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResumeDialog;