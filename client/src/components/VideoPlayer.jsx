import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  AppBar,
  Toolbar,
  Alert,
  Slider,
  Grid,
  Chip,
  Button,
  Menu,
  MenuItem,
  Paper,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Fullscreen as FullscreenIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Subtitles as SubtitlesIcon,
  HighQuality as QualityIcon,
  PictureInPicture as PipIcon,
  Replay10 as Replay10Icon,
  Forward10 as Forward10Icon,
  SkipPrevious as PrevIcon,
  SkipNext as NextIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Info as InfoIcon,
  Loop as LoopIcon
} from '@mui/icons-material';
import { getStreamUrl } from '../utils/helpers';

const VideoPlayer = ({ torrentId, fileIndex, fileName, onClose }) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isVideo, setIsVideo] = useState(true);
  
  // Enhanced player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  
  // Menu states
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState(null);
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Media info
  const [mediaInfo, setMediaInfo] = useState({
    codec: 'Unknown',
    resolution: 'Unknown',
    bitrate: 'Unknown',
    fps: 'Unknown'
  });

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    setShowControls(true);
    const newTimeout = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
    setControlsTimeout(newTimeout);
  }, [controlsTimeout, isPlaying]);

  // Video event handlers
  const setupVideoEvents = useCallback((video) => {
    const handleLoadedData = () => {
      setLoading(false);
      setDuration(video.duration);
      setMediaInfo({
        codec: 'Unknown',
        resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : 'Unknown',
        bitrate: 'Unknown',
        fps: 'Unknown'
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Update buffered
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleError = () => {
      setError('Failed to load media. The file might still be downloading or is not supported.');
      setLoading(false);
    };

    const handleLoadStart = () => {
      setError(null);
      setLoading(true);
    };

    // Add event listeners
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && torrentId && fileIndex !== undefined) {
      const streamUrl = getStreamUrl(torrentId, fileIndex, fileName);
      
      // Determine if it's a video or audio file
      const extension = fileName.split('.').pop().toLowerCase();
      const videoTypes = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi'];
      const audioTypes = ['mp3', 'wav', 'aac', 'ogg', 'm4a'];
      
      setIsVideo(videoTypes.includes(extension));
      
      console.log('File type detected:', extension, 'Is video:', videoTypes.includes(extension));
      
      // Set up video element
      const video = videoRef.current;
      
      // Clear previous source
      video.src = '';
      video.load();
      
      // Set new source with proper codec hints
      video.src = streamUrl;
      video.controls = false; // We'll use custom controls
      video.autoplay = autoplay;
      video.preload = 'metadata';
      video.loop = loop;
      video.playbackRate = playbackRate;
      video.volume = volume;
      video.muted = false; // Ensure audio is not muted by default
      video.crossOrigin = 'anonymous'; // Allow cross-origin for better codec support
      
      console.log('Video element setup:', {
        src: streamUrl,
        volume: video.volume,
        muted: video.muted,
        extension: extension
      });
      
      // Force enable audio tracks
      video.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded');
        console.log('Has audio tracks:', video.audioTracks ? video.audioTracks.length : 'Unknown');
        console.log('Volume:', video.volume);
        console.log('Muted:', video.muted);
        
        // Ensure all audio tracks are enabled
        if (video.audioTracks) {
          for (let i = 0; i < video.audioTracks.length; i++) {
            video.audioTracks[i].enabled = true;
            console.log(`Audio track ${i} enabled:`, video.audioTracks[i].enabled);
          }
        }
      });
      
      // Debug audio on first play
      video.addEventListener('play', () => {
        console.log('Video playing - Audio check:');
        console.log('- Volume:', video.volume);
        console.log('- Muted:', video.muted);
        console.log('- Has audio:', !video.muted && video.volume > 0);
        
        // Try to resume audio context
        if (typeof AudioContext !== 'undefined') {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            const audioContext = new AudioCtx();
            if (audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
              }).catch(err => {
                console.log('Failed to resume AudioContext:', err);
              });
            }
          }
        }
      });
      
      const cleanup = setupVideoEvents(video);
      
      return cleanup;
    }
  }, [torrentId, fileIndex, fileName, autoplay, loop, playbackRate, setupVideoEvents]);

  // Control functions
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // Ensure audio is enabled before play
        videoRef.current.muted = false;
        videoRef.current.volume = volume;
        
        videoRef.current.play().then(() => {
          console.log('✅ Video playing successfully');
          console.log('🔊 Audio check - Volume:', videoRef.current.volume, 'Muted:', videoRef.current.muted);
        }).catch(err => {
          console.error('❌ Play failed:', err);
          
          // Try with muted first, then unmute (browser autoplay policy workaround)
          if (err.name === 'NotAllowedError') {
            console.log('🔇 Trying muted autoplay first...');
            videoRef.current.muted = true;
            videoRef.current.play().then(() => {
              console.log('✅ Playing muted, will unmute after user interaction');
              // Unmute after a short delay
              setTimeout(() => {
                videoRef.current.muted = false;
                videoRef.current.volume = volume;
                console.log('🔊 Unmuted after successful play');
              }, 1000);
            });
          }
        });
      }
    }
  };

  const handleSeek = (newTime) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen();
        } else if (videoRef.current.webkitRequestFullscreen) {
          videoRef.current.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    }
  };

  const handlePictureInPicture = () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      if (!document.pictureInPictureElement) {
        videoRef.current.requestPictureInPicture();
      } else {
        document.exitPictureInPicture();
      }
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, currentTime + 10);
    }
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setSpeedMenuAnchor(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyF':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, duration]);

  // Mouse movement for controls
  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: 'black',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Top Controls Bar */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 2,
          p: 1
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="between">
          <Typography variant="h6" color="white" noWrap sx={{ flexGrow: 1, mr: 2 }}>
            {fileName}
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Media Info">
              <IconButton color="inherit" size="small" onClick={() => setShowInfo(true)}>
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton 
                color="inherit" 
                size="small"
                component="a"
                href={getStreamUrl(torrentId, fileIndex)}
                download={fileName}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton 
                color="inherit" 
                size="small"
                onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton color="inherit" size="small" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Loading Overlay */}
      {loading && (
        <Box 
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center',
            zIndex: 3
          }}
        >
          <LinearProgress sx={{ width: 200, mb: 2 }} />
          <Typography variant="body1">Loading media...</Typography>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Box 
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            maxWidth: '80%'
          }}
        >
          <Alert severity="error" sx={{ color: 'white', bgcolor: 'rgba(211, 47, 47, 0.8)' }}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Main Video Container */}
      <Box 
        sx={{ 
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Center Play Button */}
        {!isPlaying && !loading && (
          <IconButton
            sx={{
              position: 'absolute',
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              width: 80,
              height: 80,
              zIndex: 2
            }}
            onClick={togglePlay}
          >
            <PlayIcon sx={{ fontSize: 48 }} />
          </IconButton>
        )}

        {/* Media Element */}
        {isVideo ? (
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: 'black'
            }}
            onContextMenu={(e) => e.preventDefault()}
            onClick={togglePlay}
            playsInline
            webkit-playsinline="true"
          >
            <source src={getStreamUrl(torrentId, fileIndex, fileName)} type="video/mp4" />
            <source src={getStreamUrl(torrentId, fileIndex, fileName)} type="video/webm" />
            <source src={getStreamUrl(torrentId, fileIndex, fileName)} type="video/x-matroska" />
            Your browser does not support this video format.
          </video>
        ) : (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <Typography variant="h4" sx={{ mb: 2 }}>🎵</Typography>
              <Typography variant="h6" sx={{ mb: 3 }}>{fileName}</Typography>
              <audio
                ref={videoRef}
                style={{ width: '100%', maxWidth: '400px' }}
              />
            </Box>
          </Box>
        )}

        {/* Buffering indicator */}
        {buffered > 0 && buffered < 100 && (
          <LinearProgress 
            variant="determinate" 
            value={buffered} 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              bgcolor: 'transparent',
              '& .MuiLinearProgress-bar': { bgcolor: 'rgba(255,255,255,0.3)' }
            }}
          />
        )}
      </Box>

      {/* Bottom Controls */}
      <Box 
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 2,
          p: 2
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Slider
            value={currentTime}
            max={duration || 1}
            onChange={(_, value) => handleSeek(value)}
            sx={{
              color: 'white',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.16)' }
              },
              '& .MuiSlider-track': { border: 'none' },
              '& .MuiSlider-rail': { color: 'rgba(255, 255, 255, 0.3)' }
            }}
          />
          <Box display="flex" justifyContent="between" sx={{ mt: -1 }}>
            <Typography variant="caption" color="white">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" color="white">
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>

        {/* Control Buttons */}
        <Box display="flex" alignItems="center" justifyContent="between">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton color="inherit" onClick={skipBackward}>
              <Replay10Icon />
            </IconButton>
            <IconButton 
              color="inherit" 
              onClick={togglePlay}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton color="inherit" onClick={skipForward}>
              <Forward10Icon />
            </IconButton>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {/* Volume Control */}
            <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 150 }}>
              <IconButton color="inherit" size="small" onClick={toggleMute}>
                {isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
              </IconButton>
              <Slider
                value={isMuted ? 0 : volume}
                max={1}
                step={0.1}
                onChange={(_, value) => handleVolumeChange(value)}
                sx={{
                  color: 'white',
                  '& .MuiSlider-thumb': { width: 12, height: 12 },
                  '& .MuiSlider-rail': { color: 'rgba(255, 255, 255, 0.3)' }
                }}
              />
            </Box>

            {/* Playback Speed */}
            <Button
              color="inherit"
              size="small"
              onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
              sx={{ color: 'white', minWidth: 'auto' }}
            >
              {playbackRate}×
            </Button>

            {/* Audio Test Button */}
            <Tooltip title="Test Audio">
              <IconButton 
                color="inherit" 
                size="small" 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.volume = 1.0;
                    console.log('🔊 Audio test - Volume:', videoRef.current.volume, 'Muted:', videoRef.current.muted);
                    onNotification && onNotification('Audio test: Volume set to max, unmuted', 'info');
                  }
                }}
                sx={{ bgcolor: 'rgba(255, 165, 0, 0.3)' }}
              >
                🔊
              </IconButton>
            </Tooltip>

            {/* Picture in Picture */}
            {isVideo && document.pictureInPictureEnabled && (
              <Tooltip title="Picture in Picture">
                <IconButton color="inherit" size="small" onClick={handlePictureInPicture}>
                  <PipIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Fullscreen */}
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton color="inherit" size="small" onClick={handleFullscreen}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Media Info Chips */}
        <Box display="flex" gap={1} mt={1}>
          {mediaInfo.resolution !== 'Unknown' && (
            <Chip label={mediaInfo.resolution} size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }} />
          )}
          <Chip 
            label={getStreamUrl(torrentId, fileIndex).includes('torrent') ? 'Streaming' : 'Direct'} 
            size="small" 
            color="success"
          />
          {isVideo && (
            <Chip label="Video" size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }} />
          )}
        </Box>
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={() => setSettingsMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.9)', color: 'white' } }}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch 
                checked={autoplay} 
                onChange={(e) => setAutoplay(e.target.checked)}
                color="primary"
              />
            }
            label="Autoplay"
          />
        </MenuItem>
        <MenuItem>
          <FormControlLabel
            control={
              <Switch 
                checked={loop} 
                onChange={(e) => setLoop(e.target.checked)}
                color="primary"
              />
            }
            label="Loop"
          />
        </MenuItem>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        <MenuItem onClick={() => setShowInfo(true)}>
          <InfoIcon sx={{ mr: 1 }} />
          Media Information
        </MenuItem>
      </Menu>

      {/* Speed Menu */}
      <Menu
        anchorEl={speedMenuAnchor}
        open={Boolean(speedMenuAnchor)}
        onClose={() => setSpeedMenuAnchor(null)}
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.9)', color: 'white' } }}
      >
        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
          <MenuItem 
            key={speed} 
            onClick={() => changePlaybackRate(speed)}
            selected={playbackRate === speed}
          >
            {speed}× {speed === 1 && '(Normal)'}
          </MenuItem>
        ))}
      </Menu>

      {/* Media Info Dialog */}
      <Dialog
        open={showInfo}
        onClose={() => setShowInfo(false)}
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.9)', color: 'white' } }}
      >
        <DialogTitle>
          Media Information
          <IconButton
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
            onClick={() => setShowInfo(false)}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText primary="Filename" secondary={fileName} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Resolution" secondary={mediaInfo.resolution} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Duration" secondary={formatTime(duration)} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Current Time" secondary={formatTime(currentTime)} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Playback Rate" secondary={`${playbackRate}×`} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Stream URL" secondary={getStreamUrl(torrentId, fileIndex)} />
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help */}
      <Box 
        sx={{
          position: 'absolute',
          bottom: 60,
          right: 16,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.7)',
          p: 1,
          borderRadius: 1,
          fontSize: '0.75rem',
          opacity: showControls ? 0.7 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}
      >
        <Typography variant="caption" display="block">Space: Play/Pause</Typography>
        <Typography variant="caption" display="block">←/→: Seek ±10s</Typography>
        <Typography variant="caption" display="block">F: Fullscreen</Typography>
        <Typography variant="caption" display="block">M: Mute</Typography>
      </Box>
    </Box>
  );
};

export default VideoPlayer;