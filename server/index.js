import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import WebTorrent from 'webtorrent';
import { v4 as uuidv4 } from 'uuid';
import Database from './database.js';
import TorrentManager from './torrentManager.js';
import SearchManager from './searchManager.js';
import AdaptiveStreamingManager from './adaptiveStreamingManager.js';
import AuthController from './auth/authController.js';
import AuthMiddleware from './auth/authMiddleware.js';
import AdminController from './admin/adminController.js';
import RBACController from './rbac/rbacController.js';
import RBACManager from './rbac/rbacManager.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// TRUST DOCKER / NGINX / AWS PROXY
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["http://54.144.27.47", "https://54.144.27.47", "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
      : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api', generalLimiter);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["http://54.144.27.47", "https://54.144.27.47", "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true // Enable credentials for authentication
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize components
const db = new Database();
const rbacManager = new RBACManager(db);
const torrentManager = new TorrentManager(io, db);
const searchManager = new SearchManager();
const adaptiveStreamingManager = new AdaptiveStreamingManager();
const authController = new AuthController(db);
const authMiddleware = AuthMiddleware.getMiddleware(db);
const adminController = new AdminController(db);
const rbacController = new RBACController(db, rbacManager);

// Permission checking middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await rbacManager.userHasPermission(req.user.id, permission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication Routes
const validationRules = authController.getValidationRules();

// Registration
app.post('/api/auth/register', 
  authController.registerLimiter,
  validationRules.register,
  authController.handleValidationErrors,
  authController.register
);

// Login
app.post('/api/auth/login',
  authController.loginLimiter,
  validationRules.login,
  authController.handleValidationErrors,
  authController.login
);

// Token refresh
app.post('/api/auth/refresh', authController.refreshToken);

// Logout
app.post('/api/auth/logout', 
  authMiddleware.authenticateOptional, 
  authController.logout
);

// Email verification
app.get('/api/auth/verify/:token', authController.verifyEmail);

// Forgot password
app.post('/api/auth/forgot-password',
  authController.passwordResetLimiter,
  validationRules.forgotPassword,
  authController.handleValidationErrors,
  authController.forgotPassword
);

// Reset password
app.post('/api/auth/reset-password',
  validationRules.resetPassword,
  authController.handleValidationErrors,
  authController.resetPassword
);

// Change password (authenticated users)
app.post('/api/auth/change-password',
  authMiddleware.authenticate,
  validationRules.changePassword,
  authController.handleValidationErrors,
  authController.changePassword
);

// Get current user profile
app.get('/api/auth/profile',
  authMiddleware.authenticate,
  authController.getProfile
);

// Update user profile
app.put('/api/auth/profile',
  authMiddleware.authenticate,
  authController.updateProfile
);

// Upload user avatar
app.post('/api/auth/avatar',
  authMiddleware.authenticate,
  (req, res, next) => {
    authController.avatarUpload.single('avatar')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
          }
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  authController.uploadAvatar
);

// Delete user avatar
app.delete('/api/auth/avatar',
  authMiddleware.authenticate,
  authController.deleteAvatar
);

// Check authentication status
app.get('/api/auth/check',
  authMiddleware.authenticateOptional,
  authController.checkAuth
);

// Get authentication configuration
app.get('/api/auth/config', authController.getAuthConfig);

// RBAC Routes (for current user permissions)
app.get('/api/auth/permissions',
  authMiddleware.authenticate,
  rbacController.getMyPermissions
);

// Development only: List all users
if (process.env.NODE_ENV === 'development') {
  app.get('/api/dev/users', authController.devListUsers);
}

// Admin Routes (require admin authentication)
app.get('/api/admin/stats',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.getStats
);

app.get('/api/admin/users',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.getUsers
);

app.get('/api/admin/users/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.getUser
);

app.post('/api/admin/users',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.createUser
);

app.put('/api/admin/users/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.updateUser
);

app.delete('/api/admin/users/:id',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.deleteUser
);

app.post('/api/admin/users/:id/suspend',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.suspendUser
);

app.post('/api/admin/users/:id/activate',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.activateUser
);

app.get('/api/admin/logs',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.getLogs
);

app.get('/api/admin/notifications',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.getNotifications
);

app.get('/api/admin/users/export',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  adminController.exportUsers
);

// RBAC Management Routes (require role management permissions)
// Get all permissions grouped by category
app.get('/api/rbac/permissions',
  authMiddleware.authenticate,
  requirePermission('roles.read'),
  rbacController.getPermissions
);

// Get all roles
app.get('/api/rbac/roles',
  authMiddleware.authenticate,
  requirePermission('roles.read'),
  rbacController.getRoles
);

// Get specific role with permissions
app.get('/api/rbac/roles/:id',
  authMiddleware.authenticate,
  requirePermission('roles.read'),
  rbacController.getRole
);

// Create new custom role
app.post('/api/rbac/roles',
  authMiddleware.authenticate,
  requirePermission('roles.create'),
  rbacController.createRole
);

// Update role permissions
app.put('/api/rbac/roles/:id',
  authMiddleware.authenticate,
  requirePermission('roles.update'),
  rbacController.updateRole
);

// Delete custom role
app.delete('/api/rbac/roles/:id',
  authMiddleware.authenticate,
  requirePermission('roles.delete'),
  rbacController.deleteRole
);

// Assign role to user
app.post('/api/rbac/users/:userId/roles',
  authMiddleware.authenticate,
  requirePermission('users.roles.assign'),
  rbacController.assignUserRole
);

// Remove role from user
app.delete('/api/rbac/users/:userId/roles/:roleKey',
  authMiddleware.authenticate,
  requirePermission('users.roles.assign'),
  rbacController.removeUserRole
);

// Get user permissions and roles
app.get('/api/rbac/users/:userId/permissions',
  authMiddleware.authenticate,
  requirePermission('users.read.all'),
  rbacController.getUserPermissions
);

// Check if user has specific permission
app.get('/api/rbac/users/:userId/permissions/:permission',
  authMiddleware.authenticate,
  requirePermission('users.read.all'),
  rbacController.checkPermission
);

// Bulk assign roles to users
app.post('/api/rbac/bulk/assign-roles',
  authMiddleware.authenticate,
  requirePermission('users.roles.assign'),
  rbacController.bulkAssignRoles
);

// Get RBAC statistics
app.get('/api/rbac/stats',
  authMiddleware.authenticate,
  requirePermission('roles.read'),
  rbacController.getRBACStats
);

// Export role configurations
app.get('/api/rbac/roles/export',
  authMiddleware.authenticate,
  requirePermission('roles.read'),
  rbacController.exportRoles
);

// Import role configurations
app.post('/api/rbac/roles/import',
  authMiddleware.authenticate,
  requirePermission('roles.create'),
  rbacController.importRoles
);

// Add new torrent (requires authentication)
app.post('/api/torrents', 
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const { magnetLink } = req.body;
      const userId = req.user.id;
      
      if (!magnetLink || !magnetLink.startsWith('magnet:')) {
        return res.status(400).json({ error: 'Valid magnet link required' });
      }

      const torrentId = await torrentManager.addTorrent(magnetLink, userId);
      res.json({ 
        success: true, 
        torrentId,
        message: 'Torrent added successfully' 
      });
    } catch (error) {
      console.error('Error adding torrent:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// List user's torrents (requires authentication)
app.get('/api/torrents', 
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Admins can see all torrents, users only see their own
      const torrents = isAdmin ? 
        await db.getAllTorrents() : 
        await db.getUserTorrents(userId);
        
      res.json(torrents);
    } catch (error) {
      console.error('Error fetching torrents:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get torrent details (requires authentication and ownership check)
app.get('/api/torrents/:id', 
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const torrent = await db.getTorrent(req.params.id);
      if (!torrent) {
        return res.status(404).json({ error: 'Torrent not found' });
      }
      
      // Check ownership (only owner or admin can access)
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && torrent.owner_id !== userId) {
        return res.status(403).json({ error: 'Access denied. You can only access your own torrents.' });
      }
      
      // Try to update metadata if it's missing
      if (torrent.name === 'Loading...' || torrent.size === 0) {
        console.log(`Attempting to refresh metadata for torrent ${req.params.id}`);
        const updated = await torrentManager.updateTorrentMetadata(req.params.id);
        if (updated) {
          console.log(`Metadata refreshed for: ${updated.name}`);
          return res.json(updated);
        }
      }
      
      const files = await db.getTorrentFiles(req.params.id);
      res.json({ ...torrent, files });
    } catch (error) {
      console.error('Error fetching torrent:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Force refresh torrent metadata
app.post('/api/torrents/:id/refresh', async (req, res) => {
  try {
    // First try to get metadata from WebTorrent client
    let updated = await torrentManager.updateTorrentMetadata(req.params.id);
    
    // If that fails, try to get metadata from downloaded files
    if (!updated) {
      console.log(`Trying to get metadata from downloaded files for ${req.params.id}`);
      updated = await torrentManager.getMetadataFromFiles(req.params.id);
    }
    
    if (updated) {
      res.json({ success: true, ...updated });
    } else {
      res.status(404).json({ error: 'Torrent not found or metadata not available' });
    }
  } catch (error) {
    console.error('Error refreshing torrent metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete torrent
app.delete('/api/torrents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFiles = false } = req.query;
    
    console.log(`Removing torrent: ${id}, deleteFiles: ${deleteFiles}`);
    
    await torrentManager.removeTorrent(id, deleteFiles === 'true');
    res.json({ 
      success: true, 
      message: deleteFiles === 'true' ? 'Torrent and files removed' : 'Torrent removed (files kept)' 
    });
  } catch (error) {
    console.error('Error removing torrent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pause torrent
app.post('/api/torrents/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Pausing torrent: ${id}`);
    
    await torrentManager.pauseTorrent(id);
    res.json({ success: true, message: 'Torrent paused' });
  } catch (error) {
    console.error('Pause torrent error:', error);
    res.status(500).json({ error: 'Failed to pause torrent' });
  }
});

// Resume torrent
app.post('/api/torrents/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Resuming torrent: ${id}`);
    
    await torrentManager.resumeTorrent(id);
    res.json({ success: true, message: 'Torrent resumed' });
  } catch (error) {
    console.error('Resume torrent error:', error);
    res.status(500).json({ error: 'Failed to resume torrent' });
  }
});

// Start seeding a completed torrent
app.post('/api/torrents/:id/seed', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Starting to seed torrent: ${id}`);
    
    await torrentManager.resumeTorrent(id);
    res.json({ success: true, message: 'Torrent is now seeding' });
  } catch (error) {
    console.error('Seed torrent error:', error);
    res.status(500).json({ error: 'Failed to start seeding torrent' });
  }
});

// Start adaptive streaming session
app.post('/api/adaptive-stream/:torrentId/:fileIndex', async (req, res) => {
  try {
    const { torrentId, fileIndex } = req.params;
    
    console.log(`🎬 Starting adaptive streaming: torrentId=${torrentId}, fileIndex=${fileIndex}`);
    
    // Try to get file path from filesystem first
    const fileData = await torrentManager.streamFromFileSystem(torrentId, parseInt(fileIndex), null);
    
    if (!fileData) {
      console.log(`File not in filesystem, checking if torrent is available for streaming...`);
      
      // Check if we can get torrent info for potential streaming
      const torrent = await db.getTorrent(torrentId);
      if (!torrent) {
        return res.status(404).json({ error: 'Torrent not found' });
      }
      
      // For now, return an error indicating the file needs to be downloaded first
      return res.status(202).json({ 
        error: 'File not ready for adaptive streaming',
        message: 'File is still downloading. Adaptive streaming will be available once download completes.',
        fallbackToLegacy: true
      });
    }
    
    const { filePath } = fileData;
    
    // Start adaptive streaming session
    const streamInfo = await adaptiveStreamingManager.startAdaptiveStream(
      torrentId, 
      parseInt(fileIndex), 
      filePath
    );
    
    const baseUrl = `${req.protocol}://${req.get('host')}/api/hls`;
    
    res.json({
      sessionId: streamInfo.sessionId,
      qualities: streamInfo.qualities,
      masterPlaylistUrl: `${baseUrl}/master/${streamInfo.sessionId}.m3u8`,
      sourceInfo: streamInfo.sourceInfo
    });
    
  } catch (error) {
    console.error('Error starting adaptive stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get HLS master playlist
app.get('/api/hls/master/:sessionId.m3u8', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = adaptiveStreamingManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found');
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}/api/hls`;
    const playlist = adaptiveStreamingManager.generateMasterPlaylist(
      sessionId, 
      session.qualities, 
      baseUrl
    );
    
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(playlist);
    
  } catch (error) {
    console.error('Error serving master playlist:', error);
    res.status(500).send('Internal server error');
  }
});

// Get quality-specific playlist
app.get('/api/hls/playlist/:sessionId/:quality.m3u8', async (req, res) => {
  try {
    const { sessionId, quality } = req.params;
    const session = adaptiveStreamingManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found');
    }
    
    if (!session.qualities.includes(quality)) {
      return res.status(404).send('Quality not available');
    }
    
    // Start transcoding for this quality if not already started
    try {
      await adaptiveStreamingManager.startQualityTranscode(sessionId, quality);
    } catch (error) {
      console.error(`Error starting ${quality} transcode:`, error);
    }
    
    // Get segment list
    const segments = await adaptiveStreamingManager.getSegmentList(sessionId, quality);
    
    if (!segments) {
      // Return minimal playlist while transcoding starts
      const emptyPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
`;
      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      return res.send(emptyPlaylist);
    }
    
    const playlist = adaptiveStreamingManager.generateQualityPlaylist(segments, true);
    
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(playlist);
    
  } catch (error) {
    console.error('Error serving quality playlist:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve HLS segments
app.get('/api/hls/segment/:sessionId/:quality/:segmentName', async (req, res) => {
  try {
    const { sessionId, quality, segmentName } = req.params;
    const session = adaptiveStreamingManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found');
    }
    
    const transcoder = session.activeTranscoders.get(quality);
    if (!transcoder) {
      return res.status(404).send('Quality not available');
    }
    
    const segmentPath = path.join(transcoder.segmentPath, segmentName);
    
    // Check if segment exists
    if (!await fs.pathExists(segmentPath)) {
      return res.status(404).send('Segment not found');
    }
    
    // Stream the segment
    res.set({
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*'
    });
    
    const segmentStream = fs.createReadStream(segmentPath);
    segmentStream.pipe(res);
    
    segmentStream.on('error', (error) => {
      console.error('Error streaming segment:', error);
      if (!res.headersSent) {
        res.status(500).send('Error streaming segment');
      }
    });
    
  } catch (error) {
    console.error('Error serving segment:', error);
    res.status(500).send('Internal server error');
  }
});

// Stop adaptive streaming session
app.delete('/api/adaptive-stream/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await adaptiveStreamingManager.stopSession(sessionId);
    
    res.json({ success: true, message: 'Streaming session stopped' });
    
  } catch (error) {
    console.error('Error stopping streaming session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get adaptive streaming stats
app.get('/api/adaptive-stream/stats', (req, res) => {
  try {
    const stats = adaptiveStreamingManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting streaming stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Watch Progress API Endpoints

// Save or update watch progress
app.post('/api/watch-progress', async (req, res) => {
  try {
    const { torrentId, fileIndex, currentTime, duration, fileName, completed } = req.body;
    const userId = req.headers['x-user-id'] || 'default';
    
    // Validation
    if (!torrentId || fileIndex === undefined || currentTime === undefined || duration === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: torrentId, fileIndex, currentTime, duration' 
      });
    }
    
    // Skip saving if progress is too early (< 5%) or too late (> 95%)
    const progressPercent = (currentTime / duration) * 100;
    if (progressPercent < 5 || progressPercent > 95) {
      return res.json({ saved: false, reason: 'Progress outside save range (5%-95%)' });
    }
    
    const progressData = {
      torrentId,
      fileIndex: parseInt(fileIndex),
      userId,
      currentTime: parseFloat(currentTime),
      duration: parseFloat(duration),
      fileName,
      completed: completed || false
    };
    
    console.log(`💾 Saving watch progress: ${fileName} at ${Math.round(progressPercent)}%`);
    
    const result = await db.saveWatchProgress(progressData);
    
    res.json({ 
      saved: true, 
      progress: progressData,
      result
    });
    
  } catch (error) {
    console.error('Error saving watch progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get watch progress for a specific file
app.get('/api/watch-progress/:torrentId/:fileIndex', async (req, res) => {
  try {
    const { torrentId, fileIndex } = req.params;
    const userId = req.headers['x-user-id'] || 'default';
    
    const progress = await db.getWatchProgress(torrentId, parseInt(fileIndex), userId);
    
    if (progress) {
      console.log(`📖 Retrieved progress for ${progress.file_name}: ${progress.progress_percent}%`);
    }
    
    res.json(progress || null);
    
  } catch (error) {
    console.error('Error getting watch progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get continue watching list
app.get('/api/continue-watching', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default';
    const limit = parseInt(req.query.limit) || 10;
    
    const continueWatching = await db.getContinueWatching(userId, limit);
    
    // Add additional metadata for better UX
    const enrichedData = continueWatching.map(item => ({
      ...item,
      resumeText: `Resume at ${formatTime(item.current_time)}`,
      progressText: `${Math.round(item.progress_percent)}% watched`,
      timeRemaining: formatTime(item.duration - item.current_time),
      lastWatchedFormatted: new Date(item.last_watched).toLocaleDateString()
    }));
    
    res.json(enrichedData);
    
  } catch (error) {
    console.error('Error getting continue watching:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recently watched list
app.get('/api/recently-watched', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default';
    const limit = parseInt(req.query.limit) || 20;
    
    const recentlyWatched = await db.getRecentlyWatched(userId, limit);
    
    res.json(recentlyWatched);
    
  } catch (error) {
    console.error('Error getting recently watched:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark video as completed
app.post('/api/watch-progress/:torrentId/:fileIndex/complete', async (req, res) => {
  try {
    const { torrentId, fileIndex } = req.params;
    const userId = req.headers['x-user-id'] || 'default';
    
    const changes = await db.markAsCompleted(torrentId, parseInt(fileIndex), userId);
    
    console.log(`✅ Marked as completed: ${torrentId}/${fileIndex}`);
    
    res.json({ success: true, changes });
    
  } catch (error) {
    console.error('Error marking as completed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete watch progress
app.delete('/api/watch-progress/:torrentId/:fileIndex', async (req, res) => {
  try {
    const { torrentId, fileIndex } = req.params;
    const userId = req.headers['x-user-id'] || 'default';
    
    const changes = await db.deleteWatchProgress(torrentId, parseInt(fileIndex), userId);
    
    console.log(`🗑️ Deleted watch progress: ${torrentId}/${fileIndex}`);
    
    res.json({ success: true, changes });
    
  } catch (error) {
    console.error('Error deleting watch progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get watch statistics
app.get('/api/watch-stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default';
    
    const stats = await db.getWatchStats(userId);
    
    // Add formatted versions
    const formattedStats = {
      ...stats,
      totalWatchTimeFormatted: formatTime(stats.total_watch_time || 0),
      averageProgressFormatted: `${Math.round(stats.average_progress || 0)}%`
    };
    
    res.json(formattedStats);
    
  } catch (error) {
    console.error('Error getting watch stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old watch progress (admin endpoint)
app.post('/api/admin/cleanup-watch-progress', async (req, res) => {
  try {
    const daysOld = parseInt(req.body.daysOld) || 30;
    
    const changes = await db.cleanupOldWatchProgress(daysOld);
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${changes} old watch progress entries older than ${daysOld} days` 
    });
    
  } catch (error) {
    console.error('Error cleaning up watch progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream file (legacy endpoint - still needed for non-adaptive streaming)
app.get('/api/stream/:torrentId/:fileIndex', async (req, res) => {
  try {
    const { torrentId, fileIndex } = req.params;
    const range = req.headers.range;
    const transcode = req.query.transcode === 'true';
    
    console.log(`Streaming request: torrentId=${torrentId}, fileIndex=${fileIndex}, range=${range}, transcode=${transcode}`);
    
    const stream = await torrentManager.streamFile(torrentId, parseInt(fileIndex), range);
    
    if (!stream) {
      console.log('Stream not available, trying to restore torrent or serve from file system');
      
      // Try to serve from file system if WebTorrent stream not available
      const fileData = await torrentManager.streamFromFileSystem(torrentId, parseInt(fileIndex), range);
      
      if (!fileData) {
        return res.status(404).json({ error: 'File not found or not ready' });
      }
      
      const { filePath, start, end, fileSize, mimeType } = fileData;
      
      // Aggressive transcoding for better compatibility
      const extension = path.extname(filePath).toLowerCase();
      const needsTranscoding = ['.mkv', '.avi', '.wmv', '.flv', '.mov', '.m4v', '.webm'].includes(extension) || 
                              mimeType === 'video/x-matroska' || 
                              transcode;
      
      if (needsTranscoding) {
        console.log(`🔄 File needs real-time conversion: ${path.basename(filePath)} (${extension}) - MIME: ${mimeType}`);
        return await streamTranscodedFile(filePath, range, res);
      }
      
      // Set appropriate headers for streaming
      const headers = {
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };

      if (range) {
        headers['Content-Length'] = end - start + 1;
        headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
        res.writeHead(206, headers);
      } else {
        headers['Content-Length'] = fileSize;
        res.writeHead(200, headers);
      }
      
      // Create file stream from filesystem with improved error handling
      const fs = await import('fs');
      const fileStream = fs.createReadStream(filePath, { start, end });
      
      let streamEnded = false;
      
      const cleanupFileStream = () => {
        if (!streamEnded) {
          streamEnded = true;
          if (fileStream && typeof fileStream.destroy === 'function') {
            fileStream.destroy();
          }
        }
      };
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        cleanupFileStream();
        if (!res.headersSent) {
          res.status(500).end();
        } else if (!res.writableEnded) {
          res.end();
        }
      });
      
      fileStream.on('end', () => {
        streamEnded = true;
        if (!res.writableEnded) {
          res.end();
        }
      });
      
      // Handle client disconnect for file streams
      res.on('close', () => {
        console.log('Client disconnected from file stream');
        cleanupFileStream();
      });
      
      res.on('error', (error) => {
        console.error('Response stream error:', error);
        cleanupFileStream();
      });
      
      // Use pipeline for better error handling
      const { pipeline } = await import('stream');
      const { promisify } = await import('util');
      const pipelineAsync = promisify(pipeline);
      
      try {
        await pipelineAsync(fileStream, res);
      } catch (error) {
        if (!streamEnded) {
          console.error('File pipeline error:', error);
          cleanupFileStream();
        }
      }
      return;
    }

    const { fileStream, start, end, fileSize, mimeType, fileName } = stream;
    
    // Check if WebTorrent stream needs transcoding
    const extension = path.extname(fileName || '').toLowerCase();
    const needsWebTorrentTranscoding = ['.mkv', '.avi', '.wmv', '.flv', '.mov', '.m4v'].includes(extension) || 
                                       mimeType === 'video/x-matroska' || 
                                       transcode;
    
    if (needsWebTorrentTranscoding) {
      console.log(`🌐 WebTorrent file needs conversion: ${fileName} (${extension}) - MIME: ${mimeType}`);
      return await streamWebTorrentWithTranscoding(fileStream, fileName, range, res);
    }
    
    // Set appropriate headers for streaming
    const headers = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    if (range) {
      headers['Content-Length'] = end - start + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
      res.writeHead(206, headers);
    } else {
      headers['Content-Length'] = fileSize;
      res.writeHead(200, headers);
    }
    
    // Improved error and disconnect handling for WebTorrent streams
    let streamEnded = false;
    
    const cleanupStream = () => {
      if (!streamEnded) {
        streamEnded = true;
        if (fileStream && typeof fileStream.destroy === 'function') {
          fileStream.destroy();
        }
      }
    };
    
    fileStream.on('error', (error) => {
      console.error('WebTorrent stream error:', error);
      cleanupStream();
      if (!res.headersSent) {
        res.status(500).end();
      } else if (!res.writableEnded) {
        res.end();
      }
    });
    
    fileStream.on('end', () => {
      streamEnded = true;
      if (!res.writableEnded) {
        res.end();
      }
    });
    
    // Handle client disconnect
    res.on('close', () => {
      console.log('Client disconnected from WebTorrent stream');
      cleanupStream();
    });
    
    res.on('error', (error) => {
      console.error('Response stream error:', error);
      cleanupStream();
    });
    
    // Use pipeline for better error handling
    const { pipeline } = await import('stream');
    const { promisify } = await import('util');
    const pipelineAsync = promisify(pipeline);
    
    try {
      await pipelineAsync(fileStream, res);
    } catch (error) {
      if (!streamEnded) {
        console.error('Pipeline error:', error);
        cleanupStream();
      }
    }
  } catch (error) {
    console.error('Error streaming file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
db.init().then(async () => {
  // Try to restore active torrents on startup
  try {
    const existingTorrents = await db.getAllTorrents();
    for (const torrent of existingTorrents) {
      if (torrent.status !== 'error' && torrent.magnet_link) {
        console.log(`Restoring torrent: ${torrent.name} (${torrent.id})`);
        try {
          await torrentManager.restoreTorrent(torrent);
        } catch (error) {
          console.error(`Failed to restore torrent ${torrent.id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error restoring torrents:', error);
  }

  // Initialize RBAC system
  console.log('🔐 Initializing RBAC system...');
  await rbacManager.initialize();
  console.log('✅ RBAC system initialized successfully');

  server.listen(PORT, () => {
    console.log(`TorrentStream server running on port ${PORT}`);
    console.log(`📋 RBAC API endpoints available at http://localhost:${PORT}/api/rbac/`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

// Search torrents across multiple sources
app.get('/api/search', async (req, res) => {
  try {
    const { q: query, category, sortBy, minSeeders, limit } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    console.log(`Searching torrents: "${query}"`);
    
    const options = {
      category: category || 'all',
      sortBy: sortBy || 'seeders',
      minSeeders: parseInt(minSeeders) || 1,
      maxResults: parseInt(limit) || 50
    };

    const results = await searchManager.searchTorrents(query, options);
    
    res.json({
      query,
      results: results.length,
      torrents: results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get real-time peer information for a torrent
app.get('/api/peers/:infoHash', async (req, res) => {
  try {
    const { infoHash } = req.params;
    
    if (!infoHash || infoHash.length !== 40) {
      return res.status(400).json({ error: 'Valid info hash required' });
    }

    const peerInfo = await searchManager.getLivePeerInfo(infoHash);
    res.json(peerInfo);

  } catch (error) {
    console.error('Peer info error:', error);
    res.status(500).json({ error: 'Failed to get peer information' });
  }
});

// Preview torrent files without downloading
app.post('/api/preview', async (req, res) => {
  try {
    const { magnetLink } = req.body;
    
    if (!magnetLink || !magnetLink.startsWith('magnet:')) {
      return res.status(400).json({ error: 'Valid magnet link required' });
    }

    console.log('Previewing torrent files...');
    const files = await searchManager.previewTorrentFiles(magnetLink);
    
    res.json({
      magnetLink,
      files: files.map((file, index) => ({
        ...file,
        index,
        streamable: isStreamableFile(file.name)
      }))
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to preview torrent' });
  }
});

// Get trending torrents
app.get('/api/trending', async (req, res) => {
  try {
    const { category, limit } = req.query;
    
    console.log('Fetching trending torrents...');
    const trending = await searchManager.getTrendingTorrents(category || 'all', parseInt(limit) || 20);
    
    res.json({
      trending: trending.length,
      torrents: trending
    });

  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to get trending torrents' });
  }
});

// Advanced search with health scoring
app.get('/api/search/advanced', async (req, res) => {
  try {
    const { 
      q: query, 
      category, 
      sortBy, 
      minSeeders,
      minHealth,
      maxSize,
      minSize,
      yearMin,
      yearMax,
      excludeCAM,
      preferredSources,
      limit 
    } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    console.log(`Advanced search: "${query}"`);
    
    // Basic search first
    const options = {
      category: category || 'all',
      sortBy: sortBy || 'seeders',
      minSeeders: parseInt(minSeeders) || 1,
      maxResults: parseInt(limit) || 100
    };

    let results = await searchManager.searchTorrents(query, options);
    
    // Apply advanced filters
    const advancedFilters = {
      minHealth: parseInt(minHealth) || 0,
      maxSize: maxSize ? parseInt(maxSize) : null,
      minSize: minSize ? parseInt(minSize) : null,
      yearRange: (yearMin || yearMax) ? { 
        min: parseInt(yearMin) || 1900, 
        max: parseInt(yearMax) || new Date().getFullYear() 
      } : null,
      excludeCAM: excludeCAM === 'true',
      preferredSources: preferredSources ? preferredSources.split(',') : []
    };

    results = searchManager.filterTorrentsByAdvancedCriteria(results, advancedFilters);
    
    // Add health scores
    results = results.map(torrent => ({
      ...torrent,
      health: searchManager.calculateTorrentHealth(torrent)
    }));
    
    res.json({
      query,
      filters: advancedFilters,
      results: results.length,
      torrents: results
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Advanced search failed' });
  }
});

// Get source statistics
app.get('/api/sources/stats', async (req, res) => {
  try {
    const stats = {
      sources: [
        { name: 'piratebay', reliability: 0.85, categories: ['Movies', 'TV', 'Music', 'Software'], status: 'active' },
        { name: 'yts', reliability: 0.95, categories: ['Movies'], status: 'active' },
        { name: '1337x', reliability: 0.90, categories: ['Movies', 'TV', 'Music', 'Software', 'Games'], status: 'active' },
        { name: 'rarbg', reliability: 0.95, categories: ['Movies', 'TV', 'Software'], status: 'active' },
        { name: 'nyaa', reliability: 0.90, categories: ['Anime'], status: 'active' },
        { name: 'torrentgalaxy', reliability: 0.80, categories: ['Games', 'Software'], status: 'active' }
      ],
      totalSources: 6,
      activeSources: 6,
      lastUpdated: Date.now()
    };
    
    res.json(stats);

  } catch (error) {
    console.error('Source stats error:', error);
    res.status(500).json({ error: 'Failed to get source statistics' });
  }
});

// Helper function to check if file is streamable
function isStreamableFile(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const streamableTypes = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'mp3', 'wav', 'aac', 'ogg', 'm4a'];
  return streamableTypes.includes(extension);
}

// Helper function to format time in MM:SS or HH:MM:SS format
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Comprehensive real-time format conversion for unsupported video files
async function streamTranscodedFile(filePath, range, res) {
  console.log(`🎬 Starting real-time conversion for: ${filePath}`);
  console.log(`📁 File exists: ${await fs.pathExists(filePath)}`);
  
  // Aggressive conversion settings for maximum compatibility
  const ffmpegArgs = [
    '-re',                      // Read input at native frame rate (for streaming)
    '-i', filePath,
    
    // Video settings - force H.264 baseline profile for maximum compatibility
    '-c:v', 'libx264',
    '-preset', 'ultrafast',     // Fastest encoding for real-time
    '-tune', 'zerolatency',     // Optimize for low latency streaming
    '-profile:v', 'baseline',   // Maximum device compatibility
    '-level', '3.0',            // Compatible with older devices
    '-pix_fmt', 'yuv420p',      // Standard pixel format
    '-crf', '28',               // Balanced quality/speed (28 = fast, decent quality)
    '-maxrate', '2M',           // Limit bitrate to 2Mbps
    '-bufsize', '4M',           // Buffer size
    '-g', '60',                 // GOP size (keyframe every 60 frames)
    '-keyint_min', '60',
    '-sc_threshold', '0',       // Disable scene change detection
    
    // Audio settings - force AAC with standard settings
    '-c:a', 'aac',
    '-b:a', '128k',             // Good quality audio bitrate
    '-ar', '44100',             // Standard sample rate
    '-ac', '2',                 // Force stereo
    '-aac_coder', 'twoloop',    // Better AAC encoding
    
    // Streaming optimizations for web browsers
    '-movflags', 'frag_keyframe+empty_moov+faststart+dash',
    '-f', 'mp4',
    '-avoid_negative_ts', 'make_zero',
    '-fflags', '+genpts+igndts', // Generate PTS and ignore DTS
    '-vsync', 'cfr',            // Constant frame rate
    '-async', '1',              // Audio sync
    '-strict', 'experimental',   // Allow experimental features
    
    // Output to stdout
    'pipe:1'
  ];
  
  // Handle seeking for range requests
  let seekTime = 0;
  if (range) {
    const match = range.match(/bytes=(\d+)-/);
    if (match) {
      const seekBytes = parseInt(match[1]);
      
      // For range requests, estimate seek time
      // This is approximate but works better than byte-based seeking
      if (seekBytes > 1024 * 1024) { // Only seek if more than 1MB
        seekTime = Math.floor(seekBytes / (1024 * 1024 * 2)); // Rough: 2MB per second estimate
        ffmpegArgs.splice(1, 0, '-ss', seekTime.toString());
        console.log(`🕐 Seeking to approximately ${seekTime}s for range request`);
      }
    }
  }
  
  console.log('🔧 FFmpeg args:', ffmpegArgs.join(' '));
  
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Set streaming headers
  const headers = {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range',
    'Accept-Ranges': 'bytes',
    'Transfer-Encoding': 'chunked'
  };
  
  // For range requests, return 206 Partial Content
  if (range) {
    headers['Content-Range'] = `bytes ${seekTime * 1024 * 1024}-/*`;
    res.writeHead(206, headers);
  } else {
    res.writeHead(200, headers);
  }
  
  let ffmpegStarted = false;
  let bytesWritten = 0;
  
  // Handle FFmpeg stdout (the converted video data)
  ffmpeg.stdout.on('data', (chunk) => {
    if (!ffmpegStarted) {
      ffmpegStarted = true;
      console.log('🚀 FFmpeg conversion started, streaming data...');
    }
    
    if (!res.writableEnded) {
      try {
        res.write(chunk);
        bytesWritten += chunk.length;
        
        // Log progress every 1MB
        if (bytesWritten % (1024 * 1024) === 0) {
          console.log(`📊 Streamed ${Math.round(bytesWritten / 1024 / 1024)}MB`);
        }
      } catch (error) {
        console.error('Error writing chunk to response:', error);
      }
    }
  });
  
  ffmpeg.stdout.on('end', () => {
    console.log('✅ FFmpeg conversion completed');
    if (!res.writableEnded) {
      res.end();
    }
  });
  
  // Handle FFmpeg stderr (logs and errors)
  let stderrBuffer = '';
  ffmpeg.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
    
    // Look for important information
    const lines = stderrBuffer.split('\n');
    stderrBuffer = lines.pop(); // Keep incomplete line in buffer
    
    lines.forEach(line => {
      if (line.includes('Stream #')) {
        console.log(`📹 ${line.trim()}`);
      } else if (line.includes('frame=') && line.includes('time=')) {
        // Extract time information for progress
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          const [, hours, minutes, seconds] = timeMatch;
          const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          console.log(`⏱️  Converting at ${Math.round(totalSeconds)}s...`);
        }
      } else if (line.includes('error') || line.includes('Error')) {
        console.error(`❌ FFmpeg error: ${line.trim()}`);
      }
    });
  });
  
  // Handle FFmpeg process events
  ffmpeg.on('close', (code, signal) => {
    console.log(`🏁 FFmpeg process closed - Code: ${code}, Signal: ${signal}, Bytes written: ${bytesWritten}`);
    if (!res.writableEnded) {
      res.end();
    }
  });
  
  ffmpeg.on('error', (error) => {
    console.error('💥 FFmpeg spawn error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Video conversion failed', details: error.message });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
  
  // Enhanced client disconnect handling
  const cleanup = () => {
    if (ffmpeg && !ffmpeg.killed) {
      console.log('🛑 Client disconnected, terminating FFmpeg process...');
      
      // Try graceful shutdown first
      ffmpeg.kill('SIGTERM');
      
      // Force kill if still running after 3 seconds
      const forceKillTimer = setTimeout(() => {
        if (!ffmpeg.killed) {
          console.log('🔨 Force killing FFmpeg process');
          ffmpeg.kill('SIGKILL');
        }
      }, 3000);
      
      // Clean up timer if process exits gracefully
      ffmpeg.on('close', () => {
        clearTimeout(forceKillTimer);
      });
    }
  };
  
  res.on('close', cleanup);
  res.on('error', (error) => {
    console.error('📡 Response stream error:', error);
    cleanup();
  });
  
  // Timeout protection - kill conversion if it takes too long to start
  const startupTimeout = setTimeout(() => {
    if (!ffmpegStarted) {
      console.error('⏰ FFmpeg startup timeout - killing process');
      cleanup();
    }
  }, 30000); // 30 second timeout
  
  ffmpeg.stdout.once('data', () => {
    clearTimeout(startupTimeout);
  });
}

// Function to transcode WebTorrent streams on-the-fly
async function streamWebTorrentWithTranscoding(inputStream, fileName, range, res) {
  console.log(`🌐 Starting WebTorrent transcoding for: ${fileName}`);
  
  // Aggressive conversion settings for maximum compatibility
  // Detect input format from filename extension
  const extension = fileName ? path.extname(fileName).toLowerCase() : '';
  let inputFormat = null;
  
  switch (extension) {
    case '.mkv':
      inputFormat = 'matroska';
      break;
    case '.avi':
      inputFormat = 'avi';
      break;
    case '.mov':
    case '.m4v':
      inputFormat = 'mov';
      break;
    case '.mp4':
      inputFormat = 'mp4';
      break;
    case '.webm':
      inputFormat = 'webm';
      break;
    default:
      inputFormat = null; // Let FFmpeg auto-detect
  }
  
  const ffmpegArgs = [];
  
  // Add input format if detected
  if (inputFormat) {
    ffmpegArgs.push('-f', inputFormat);
  }
  
  ffmpegArgs.push('-i', 'pipe:0'); // Read from stdin
  
  // Add video settings - force H.264 baseline profile for maximum compatibility
  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',     // Fastest encoding for real-time
    '-tune', 'zerolatency',     // Optimize for low latency streaming
    '-profile:v', 'baseline',   // Maximum device compatibility
    '-level', '3.0',            // Compatible with older devices
    '-pix_fmt', 'yuv420p',      // Standard pixel format
    '-crf', '28',               // Balanced quality/speed
    '-maxrate', '2M',           // Limit bitrate to 2Mbps
    '-bufsize', '4M',           // Buffer size
    '-g', '60',                 // GOP size
    '-keyint_min', '60',
    '-sc_threshold', '0',       // Disable scene change detection
    
    // Audio settings - force AAC with standard settings
    '-c:a', 'aac',
    '-b:a', '128k',             // Good quality audio bitrate
    '-ar', '44100',             // Standard sample rate
    '-ac', '2',                 // Force stereo
    '-aac_coder', 'twoloop',    // Better AAC encoding
    
    // Streaming optimizations for web browsers
    '-movflags', 'frag_keyframe+empty_moov+faststart',
    '-f', 'mp4',
    '-avoid_negative_ts', 'make_zero',
    '-fflags', '+genpts+igndts',
    '-vsync', 'cfr',            // Constant frame rate
    '-async', '1',              // Audio sync
    '-strict', 'experimental',
    
    // Output to stdout
    'pipe:1'
  );
  
  console.log('🔧 WebTorrent FFmpeg args:', ffmpegArgs.join(' '));
  
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Set streaming headers
  const headers = {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range',
    'Accept-Ranges': 'bytes',
    'Transfer-Encoding': 'chunked'
  };
  
  // For range requests, return 206 Partial Content
  if (range) {
    headers['Content-Range'] = 'bytes 0-/*';
    res.writeHead(206, headers);
  } else {
    res.writeHead(200, headers);
  }
  
  let ffmpegStarted = false;
  let bytesWritten = 0;
  let inputEnded = false;
  
  // Pipe WebTorrent stream to FFmpeg stdin
  inputStream.on('data', (chunk) => {
    if (!ffmpeg.stdin.destroyed) {
      try {
        ffmpeg.stdin.write(chunk);
      } catch (error) {
        console.error('Error writing to FFmpeg stdin:', error);
      }
    }
  });
  
  inputStream.on('end', () => {
    console.log('📥 WebTorrent input stream ended');
    inputEnded = true;
    if (!ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.end();
    }
  });
  
  inputStream.on('error', (error) => {
    console.error('📥 WebTorrent input stream error:', error);
    if (!ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.destroy();
    }
  });
  
  // Handle FFmpeg stdout (the converted video data)
  ffmpeg.stdout.on('data', (chunk) => {
    if (!ffmpegStarted) {
      ffmpegStarted = true;
      console.log('🚀 WebTorrent FFmpeg conversion started, streaming data...');
    }
    
    if (!res.writableEnded) {
      try {
        res.write(chunk);
        bytesWritten += chunk.length;
        
        // Log progress every 1MB
        if (bytesWritten % (1024 * 1024) === 0) {
          console.log(`📊 WebTorrent streamed ${Math.round(bytesWritten / 1024 / 1024)}MB`);
        }
      } catch (error) {
        console.error('Error writing chunk to response:', error);
      }
    }
  });
  
  ffmpeg.stdout.on('end', () => {
    console.log('✅ WebTorrent FFmpeg conversion completed');
    if (!res.writableEnded) {
      res.end();
    }
  });
  
  // Handle FFmpeg stderr (logs and errors)
  let stderrBuffer = '';
  ffmpeg.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
    
    const lines = stderrBuffer.split('\n');
    stderrBuffer = lines.pop();
    
    lines.forEach(line => {
      if (line.includes('Stream #')) {
        console.log(`📹 WebTorrent: ${line.trim()}`);
      } else if (line.includes('frame=') && line.includes('time=')) {
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          const [, hours, minutes, seconds] = timeMatch;
          const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          console.log(`⏱️  WebTorrent converting at ${Math.round(totalSeconds)}s...`);
        }
      } else if (line.includes('error') || line.includes('Error')) {
        console.error(`❌ WebTorrent FFmpeg error: ${line.trim()}`);
      }
    });
  });
  
  // Handle FFmpeg process events
  ffmpeg.on('close', (code, signal) => {
    console.log(`🏁 WebTorrent FFmpeg closed - Code: ${code}, Signal: ${signal}, Bytes: ${bytesWritten}`);
    if (!res.writableEnded) {
      res.end();
    }
  });
  
  ffmpeg.on('error', (error) => {
    console.error('💥 WebTorrent FFmpeg spawn error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'WebTorrent conversion failed', details: error.message });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
  
  // Enhanced cleanup for WebTorrent transcoding
  const cleanup = () => {
    console.log('🛑 Cleaning up WebTorrent transcoding...');
    
    // Stop input stream
    if (inputStream && typeof inputStream.destroy === 'function') {
      inputStream.destroy();
    }
    
    // Stop FFmpeg
    if (ffmpeg && !ffmpeg.killed) {
      console.log('🛑 Terminating WebTorrent FFmpeg process...');
      
      if (!ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.destroy();
      }
      
      ffmpeg.kill('SIGTERM');
      
      setTimeout(() => {
        if (!ffmpeg.killed) {
          console.log('🔨 Force killing WebTorrent FFmpeg process');
          ffmpeg.kill('SIGKILL');
        }
      }, 3000);
    }
  };
  
  res.on('close', cleanup);
  res.on('error', (error) => {
    console.error('📡 WebTorrent response stream error:', error);
    cleanup();
  });
  
  // Timeout protection
  const startupTimeout = setTimeout(() => {
    if (!ffmpegStarted) {
      console.error('⏰ WebTorrent FFmpeg startup timeout');
      cleanup();
    }
  }, 30000);
  
  ffmpeg.stdout.once('data', () => {
    clearTimeout(startupTimeout);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  torrentManager.cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});