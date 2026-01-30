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
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["http://54.144.27.47", "https://54.144.27.47", "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize components
const db = new Database();
const torrentManager = new TorrentManager(io, db);
const searchManager = new SearchManager();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add new torrent
app.post('/api/torrents', async (req, res) => {
  try {
    const { magnetLink } = req.body;
    
    if (!magnetLink || !magnetLink.startsWith('magnet:')) {
      return res.status(400).json({ error: 'Valid magnet link required' });
    }

    const torrentId = await torrentManager.addTorrent(magnetLink);
    res.json({ 
      success: true, 
      torrentId,
      message: 'Torrent added successfully' 
    });
  } catch (error) {
    console.error('Error adding torrent:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all torrents
app.get('/api/torrents', async (req, res) => {
  try {
    const torrents = await db.getAllTorrents();
    res.json(torrents);
  } catch (error) {
    console.error('Error fetching torrents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get torrent details
app.get('/api/torrents/:id', async (req, res) => {
  try {
    const torrent = await db.getTorrent(req.params.id);
    if (!torrent) {
      return res.status(404).json({ error: 'Torrent not found' });
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
});

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

// Stream file
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

  server.listen(PORT, () => {
    console.log(`TorrentStream server running on port ${PORT}`);
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
  const ffmpegArgs = [
    '-f', 'matroska',           // Input format (most flexible for various containers)
    '-i', 'pipe:0',             // Read from stdin
    
    // Video settings - force H.264 baseline profile for maximum compatibility
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
  ];
  
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