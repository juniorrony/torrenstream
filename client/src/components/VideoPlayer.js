import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  AppBar,
  Toolbar,
  Alert
} from '@mui/material';
import { Close as CloseIcon, Fullscreen as FullscreenIcon } from '@mui/icons-material';
import { getStreamUrl } from '../utils/helpers';

const VideoPlayer = ({ torrentId, fileIndex, fileName, onClose }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isVideo, setIsVideo] = useState(true);

  useEffect(() => {
    if (videoRef.current && torrentId && fileIndex !== undefined) {
      const streamUrl = getStreamUrl(torrentId, fileIndex);
      
      // Determine if it's a video or audio file
      const extension = fileName.split('.').pop().toLowerCase();
      const videoTypes = ['mp4', 'webm', 'mov', 'm4v'];
      const audioTypes = ['mp3', 'wav', 'aac', 'ogg', 'm4a'];
      
      setIsVideo(videoTypes.includes(extension));
      
      // Set up video element
      const video = videoRef.current;
      video.src = streamUrl;
      video.controls = true;
      video.autoplay = false;
      video.preload = 'metadata';
      
      // Error handling
      const handleError = () => {
        setError('Failed to load media. The file might still be downloading or is not supported.');
      };
      
      const handleLoadStart = () => {
        setError(null);
      };

      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      
      return () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
      };
    }
  }, [torrentId, fileIndex, fileName]);

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: 'black' }}>
      {/* Player header */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} noWrap>
            {fileName}
          </Typography>
          <IconButton
            color="inherit"
            onClick={handleFullscreen}
            sx={{ mr: 1 }}
          >
            <FullscreenIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Error display */}
      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            {error}
          </Alert>
        </Box>
      )}

      {/* Media player */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '60vh',
          p: 2
        }}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: '70vh',
              backgroundColor: 'black'
            }}
            onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
          />
        ) : (
          <audio
            ref={videoRef}
            style={{
              width: '100%',
              maxWidth: '600px'
            }}
            controls
          />
        )}
      </Box>

      {/* Usage tips */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {isVideo ? 
            'Use spacebar to play/pause • Arrow keys to seek • F for fullscreen' :
            'Audio playback controls available above'
          }
        </Typography>
      </Box>
    </Box>
  );
};

export default VideoPlayer;