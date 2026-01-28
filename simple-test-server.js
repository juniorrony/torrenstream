// Simple test server using only built-in Node.js modules
const http = require('http');
const url = require('url');

const PORT = 5000;

// Mock data for testing
let mockTorrents = [
  {
    id: 'test-torrent-1',
    name: 'Sample Movie.mp4',
    status: 'completed',
    progress: 1,
    size: 1073741824, // 1GB
    download_speed: 0,
    upload_speed: 0,
    peers: 5,
    created_at: new Date().toISOString()
  }
];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Routes
  if (path === '/api/health' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'TorrentStream Test Server Running'
    }));
  }
  else if (path === '/api/torrents' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify(mockTorrents));
  }
  else if (path === '/api/torrents' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { magnetLink } = JSON.parse(body);
        
        if (!magnetLink || !magnetLink.startsWith('magnet:')) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Valid magnet link required' }));
          return;
        }

        const newTorrent = {
          id: 'test-torrent-' + Date.now(),
          name: 'Demo Torrent ' + Date.now(),
          status: 'downloading',
          progress: 0.25,
          size: 524288000, // 500MB
          download_speed: 1048576, // 1MB/s
          upload_speed: 262144, // 256KB/s
          peers: 3,
          created_at: new Date().toISOString()
        };

        mockTorrents.unshift(newTorrent);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          torrentId: newTorrent.id,
          message: 'Demo torrent added (this is a test server)'
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
  else if (path.startsWith('/api/torrents/') && method === 'DELETE') {
    const torrentId = path.split('/')[3];
    const index = mockTorrents.findIndex(t => t.id === torrentId);
    
    if (index === -1) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Torrent not found' }));
      return;
    }
    
    mockTorrents.splice(index, 1);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Torrent removed' }));
  }
  else if (path.startsWith('/api/torrents/') && method === 'GET') {
    const torrentId = path.split('/')[3];
    const torrent = mockTorrents.find(t => t.id === torrentId);
    
    if (!torrent) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Torrent not found' }));
      return;
    }
    
    const mockFiles = [
      {
        id: 1,
        torrent_id: torrentId,
        file_index: 0,
        name: torrent.name.includes('.mp4') ? torrent.name : `${torrent.name}.mp4`,
        path: torrent.name,
        size: torrent.size,
        mime_type: 'video/mp4'
      }
    ];
    
    res.writeHead(200);
    res.end(JSON.stringify({ ...torrent, files: mockFiles }));
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🧲 TorrentStream Test Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Ready for frontend testing!`);
});