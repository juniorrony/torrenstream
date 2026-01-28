// Simplified test server to verify basic functionality
import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for testing
let mockTorrents = [
  {
    id: 'test-torrent-1',
    name: 'Sample Movie.mp4',
    status: 'completed',
    progress: 1,
    size: 1024 * 1024 * 1024, // 1GB
    download_speed: 0,
    upload_speed: 0,
    peers: 5,
    created_at: new Date().toISOString()
  }
];

let mockFiles = [
  {
    id: 1,
    torrent_id: 'test-torrent-1',
    file_index: 0,
    name: 'Sample Movie.mp4',
    path: 'Sample Movie.mp4',
    size: 1024 * 1024 * 1024,
    mime_type: 'video/mp4'
  }
];

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'TorrentStream Test Server Running'
  });
});

app.get('/api/torrents', (req, res) => {
  res.json(mockTorrents);
});

app.post('/api/torrents', (req, res) => {
  const { magnetLink } = req.body;
  
  if (!magnetLink || !magnetLink.startsWith('magnet:')) {
    return res.status(400).json({ error: 'Valid magnet link required' });
  }

  const newTorrent = {
    id: 'test-torrent-' + Date.now(),
    name: 'Demo Torrent ' + Date.now(),
    status: 'downloading',
    progress: 0.25,
    size: 500 * 1024 * 1024, // 500MB
    download_speed: 1024 * 1024, // 1MB/s
    upload_speed: 256 * 1024, // 256KB/s
    peers: 3,
    created_at: new Date().toISOString()
  };

  mockTorrents.unshift(newTorrent);
  
  res.json({ 
    success: true, 
    torrentId: newTorrent.id,
    message: 'Demo torrent added (this is a test server)'
  });
});

app.get('/api/torrents/:id', (req, res) => {
  const torrent = mockTorrents.find(t => t.id === req.params.id);
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  const files = mockFiles.filter(f => f.torrent_id === req.params.id);
  res.json({ ...torrent, files });
});

app.delete('/api/torrents/:id', (req, res) => {
  const index = mockTorrents.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  mockTorrents.splice(index, 1);
  res.json({ success: true, message: 'Torrent removed' });
});

app.get('/api/stream/:torrentId/:fileIndex', (req, res) => {
  res.json({ 
    message: 'Streaming endpoint (demo mode)', 
    torrentId: req.params.torrentId,
    fileIndex: req.params.fileIndex,
    note: 'In production, this would stream actual file content'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧲 TorrentStream Test Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Ready for frontend testing!`);
});