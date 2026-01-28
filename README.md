# 🧲 TorrentStream - Advanced Torrent Streaming Platform

**A complete, professional-grade torrent streaming platform that rivals and exceeds Seedr.cc capabilities.**

**Stream torrents instantly • 6-source discovery • Real-time downloads • Self-hosted privacy**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18+-brightgreen)
![React](https://img.shields.io/badge/react-18-blue)
![WebTorrent](https://img.shields.io/badge/webtorrent-enabled-orange)

## 🌟 **What Makes TorrentStream Special**

Unlike basic torrent clients, TorrentStream provides a **complete web-based streaming experience**:

- **🔍 Multi-Source Discovery** - Search across 6 major torrent networks simultaneously
- **📊 Advanced Health Scoring** - Intelligent torrent quality assessment 
- **🎥 Instant Streaming** - Watch videos while downloading (no waiting!)
- **⚡ Selective Downloads** - Choose specific files within torrents
- **📱 Modern Web Interface** - Responsive Material-UI design
- **🔒 Complete Privacy** - Self-hosted, no external dependencies
- **🌐 Production Ready** - Docker deployment, API access, real-time updates

## 🚀 **Core Features**

### **🔍 Advanced Discovery Engine**
- **Multi-Source Search** - PirateBay, YTS, 1337x, RARBG, Nyaa, TorrentGalaxy
- **Smart Health Scoring** - Algorithm considers seeders, source reliability, popularity
- **Quality Detection** - Auto-detects 4K, 1080p, 720p, CAM quality
- **Advanced Filtering** - Size, health, year, source preferences
- **Real-time Peer Tracking** - Live seeders/leechers counts

### **📥 Intelligent Downloading**
- **Selective File Downloads** - Choose specific files within torrents
- **Preview Before Download** - See torrent contents without downloading
- **Progress Monitoring** - Real-time download speeds and peer counts
- **Auto-Recovery** - Resume downloads after server restarts
- **Storage Management** - Efficient file organization and cleanup

### **🎥 Seamless Streaming**
- **Stream While Downloading** - No waiting for completion
- **HTTP Range Support** - Seeking, scrubbing, quality adjustment
- **Multiple Formats** - MP4, MKV, AVI, WebM, MP3, AAC, OGG
- **In-browser Playback** - No external players required
- **Subtitle Support** - SRT files automatically detected

### **🎨 Professional Interface**
- **React + Material-UI** - Modern, responsive design
- **Real-time Updates** - WebSocket-powered live data
- **Tabbed Interface** - Discovery and management views
- **Progress Visualizations** - Interactive charts and indicators
- **Mobile Optimized** - Works perfectly on all devices

## 🏗️ **Technology Stack**

### **Backend Architecture**
- **Node.js 18+** with Express.js framework
- **WebTorrent Engine** for BitTorrent protocol handling
- **Multi-Source APIs** - PirateBay, YTS, 1337x, RARBG, Nyaa, TorrentGalaxy
- **Socket.io** for real-time bidirectional communication
- **SQLite Database** with optimized schemas for metadata
- **Advanced Search Engine** with health scoring algorithms

### **Frontend Technology**
- **React 18** with modern hooks and functional components
- **Material-UI (MUI)** component library for professional design
- **Socket.io Client** for live updates and notifications  
- **Axios** for HTTP API communication with interceptors
- **HTML5 Video/Audio** APIs for native media playback
- **Responsive CSS Grid/Flexbox** for mobile-first design

### **Development & Deployment**
- **Docker & Docker Compose** for containerized deployment
- **Nginx** reverse proxy configuration included
- **ESLint & Prettier** for code quality and formatting
- **Environment Configuration** for development/production
- **Health Checks & Monitoring** built-in
- **Graceful Shutdown** handling for production stability

## 🏛️ **System Architecture**

```
                    🌐 TorrentStream Platform Architecture
    
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   🎨 Frontend   │    │   ⚡ Backend     │    │  🧲 Discovery   │
│   React + MUI   │◄──►│   Node.js API   │◄──►│  Multi-Source   │
│   Real-time UI  │    │   WebTorrent    │    │  Search Engine  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
    📱 WebSocket             🔄 REST API              🔍 6 Sources
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  🎥 Streaming   │    │  💾 Database    │    │  📁 Storage     │
│  HTTP/Range     │    │  SQLite         │    │  Local Files    │
│  Multi-format   │    │  Metadata       │    │  Downloads      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

📊 Data Flow: Discovery → Selection → Download → Stream → Manage
```

## 🚀 **Quick Start Guide**

### **⚡ Option 1: One-Command Setup (Recommended)**
```bash
# Clone and setup everything automatically
git clone https://github.com/yourusername/torrentstream.git
cd torrentstream
chmod +x setup.sh
./setup.sh
# Choose option 3 for development setup
# Open http://localhost:3000 when complete
```

### **🐳 Option 2: Docker Deployment**
```bash
# Production-ready containerized deployment
git clone https://github.com/yourusername/torrentstream.git
cd torrentstream
docker-compose up -d

# Access the application
open http://localhost:3000

# View logs: docker-compose logs -f
# Stop: docker-compose down
```

### **🛠️ Option 3: Manual Development Setup**
```bash
# For developers who want full control
git clone https://github.com/yourusername/torrentstream.git
cd torrentstream

# Install dependencies for both frontend and backend
npm run install-all

# Start both servers simultaneously
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:3000

# Or start individually:
npm run server    # Backend only
npm run client    # Frontend only
```

### **⚡ Quick Test Commands**
```bash
# Test the platform with sample data
curl http://localhost:5000/api/health
curl "http://localhost:5000/api/search?q=big+buck+bunny"
open test-advanced-discovery.html  # Advanced testing interface
```

## 📋 **Installation Requirements**

### **System Prerequisites**
| Requirement | Minimum | Recommended | Notes |
|------------|---------|-------------|-------|
| **Node.js** | 18.0+ | 20.0+ | ES Modules support required |
| **npm** | 8.0+ | 9.0+ | Package management |
| **RAM** | 2GB | 4GB+ | For concurrent downloads |
| **Storage** | 5GB | 50GB+ | Downloaded torrents |
| **Network** | Broadband | High-speed | BitTorrent performance |

### **Optional Components**
- **Docker & Docker Compose** - For containerized deployment
- **Nginx** - For production reverse proxy (config included)
- **VPN** - Recommended for privacy and security
- **Modern Browser** - Chrome, Firefox, Safari, Edge (latest versions)

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd torrentstream
   npm run install-all
   ```

2. **Start Development**
   ```bash
   npm run dev
   ```
   This starts both backend (port 5000) and frontend (port 3000)

3. **Environment Configuration**
   Create `.env` files if needed:
   
   **server/.env**
   ```
   PORT=5000
   NODE_ENV=development
   ```
   
   **client/.env**
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

### Production Deployment

#### Docker Deployment
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Manual Deployment
```bash
# Backend
cd server
npm install --production
npm start

# Frontend (build and serve)
cd client
npm install
npm run build
# Serve build folder with nginx/apache
```

## 🎯 **Comprehensive Usage Guide**

### **🔍 Discovery & Search**
**1. Multi-Source Search**
- Navigate to the **"Discover"** tab
- Enter search terms (movies, TV shows, software, etc.)
- Use **advanced filters**: category, quality, size, health score
- **Source selection**: Choose preferred torrent sources
- **Quality detection**: Automatically identifies 4K, 1080p, 720p

**2. Health Assessment**
- **Health Score**: 0-100% based on seeders, source reliability, popularity
- **Live Peer Counts**: Real-time seeders/leechers data
- **Source Reliability**: Each source rated 80-95% reliability

### **📥 Smart Downloading**
**1. Adding Torrents**
- **Discovery Method**: Search and click "Add" from results
- **Direct Method**: Use + button, paste magnet link
- **Selective Downloads**: Preview files, choose specific ones
- **Bulk Operations**: Add multiple torrents simultaneously

**2. Download Management**
- **Real-time Progress**: Live speed, peer count, ETA updates
- **Priority Control**: Pause, resume, remove downloads
- **Storage Monitoring**: Track disk usage and free space
- **Auto-Recovery**: Downloads resume after restarts

### **🎥 Advanced Streaming**
**1. Instant Playback**
- **Stream While Downloading**: No waiting for completion
- **HTTP Range Support**: Seek to any position instantly  
- **Quality Selection**: Multiple resolutions when available
- **Subtitle Support**: Auto-detected SRT files

**2. Media Controls**
- **Full-screen Mode**: Immersive viewing experience
- **Seeking & Scrubbing**: Precise playback control
- **Volume & Speed**: Adjustable playback settings
- **Mobile Optimized**: Touch-friendly controls

### **📊 Monitoring & Analytics**
- **Performance Metrics**: Download/upload speeds, peer statistics
- **Health Monitoring**: Torrent quality scores and warnings
- **Source Analysis**: Reliability and success rates per source
- **Usage Statistics**: Storage, bandwidth, and activity tracking

## 📁 **Supported File Formats**

### **🎥 Video Streaming (Native Browser Support)**
| Format | Codec | Quality Support | Seeking | Notes |
|--------|-------|----------------|---------|-------|
| **MP4** | H.264/H.265 | 4K/1080p/720p | ✅ Perfect | Best compatibility |
| **WebM** | VP8/VP9 | 4K/1080p | ✅ Perfect | Modern standard |
| **MKV** | Various | 4K/1080p/720p | ✅ Good | High quality |
| **MOV** | H.264 | 1080p/720p | ✅ Good | Apple format |
| **AVI** | Various | 1080p/720p | ⚠️ Limited | Legacy format |

### **🎵 Audio Streaming**
| Format | Quality | Streaming | Notes |
|--------|---------|-----------|-------|
| **MP3** | Up to 320kbps | ✅ Perfect | Universal support |
| **AAC** | High quality | ✅ Perfect | Modern standard |
| **OGG** | Lossless | ✅ Good | Open source |
| **WAV** | Uncompressed | ✅ Good | Large files |
| **M4A** | High quality | ✅ Good | Apple format |

### **📄 Preview & Download Support**
- **Archives**: ZIP, RAR, 7Z, TAR, GZ, XZ
- **Documents**: PDF, DOC, DOCX, TXT, RTF, EPUB
- **Images**: JPG, PNG, GIF, BMP, SVG, WebP
- **Software**: EXE, DMG, DEB, RPM, APK
- **Subtitles**: SRT, VTT, ASS, SUB
- **Any other file type** (download only)

### **⚡ Streaming Performance Notes**
- **Instant Start**: MP4/WebM begin streaming immediately
- **Progressive Download**: Seeking available as file downloads
- **Quality Adaptation**: Multiple quality options when available
- **Subtitle Sync**: SRT files automatically detected and loaded
- **Mobile Optimized**: All formats work on mobile devices

## 🛠️ **Troubleshooting & Optimization**

### **🚨 Common Issues & Solutions**

| Issue | Symptoms | Solution | Prevention |
|-------|----------|----------|------------|
| **"Failed to add torrent"** | Error when adding magnet link | Verify magnet link format, check network | Use torrents from reliable sources |
| **Slow downloads** | Low speed despite good connection | Check seeders count, try different torrents | Filter by health score >70% |
| **Streaming buffer** | Video stutters or stops | Wait for more data, check file format | Use MP4/WebM formats |
| **WebSocket errors** | No live updates | Server restart, browser refresh | Use modern browsers |
| **Port conflicts** | Server won't start | Change ports in config | Check port availability |

### **⚡ Performance Optimization**

**Download Performance**
```bash
# Monitor system resources
curl http://localhost:5000/api/health

# Check torrent health before downloading
curl "http://localhost:5000/api/search/advanced?minHealth=80"

# Limit concurrent downloads for better speeds
# Edit server configuration to limit active torrents
```

**Storage Management**
```bash
# Check disk usage
df -h downloads/

# Clean completed torrents
# Use the web interface or API to remove old downloads

# Monitor database size
ls -la data/torrents.db
```

**Network Optimization**
- **Use VPN**: Improves privacy and sometimes speed
- **Port Forwarding**: Configure router for ports 6881-6889
- **Bandwidth Limiting**: Set download/upload limits in peak hours
- **Peer Limits**: Adjust max peers per torrent for stability

### **🔒 Security & Privacy Best Practices**

**Legal Compliance**
- ✅ Only download content you own or is legally free
- ✅ Respect copyright laws in your jurisdiction  
- ✅ Use for legal software, open source projects, public domain media
- ❌ Never download copyrighted material without permission

**Privacy Protection**
- 🛡️ **VPN Recommended**: Hide your IP from peers
- 🛡️ **Firewall Rules**: Block unnecessary incoming connections
- 🛡️ **Regular Updates**: Keep TorrentStream updated
- 🛡️ **Secure Networks**: Avoid public WiFi for downloading

**System Security**
- 🔐 **Antivirus Scanning**: Scan downloaded files
- 🔐 **Isolated Downloads**: Use separate user account
- 🔐 **Regular Backups**: Backup important data
- 🔐 **Monitor Resources**: Watch CPU/memory usage

## Development

### Project Structure
```
torrentstream/
├── server/           # Node.js backend
│   ├── index.js     # Main server file
│   ├── database.js  # SQLite database handler
│   ├── torrentManager.js # WebTorrent integration
│   └── package.json
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # State management
│   │   └── utils/       # Helper functions
│   └── package.json
├── downloads/       # Downloaded torrent files
├── data/           # SQLite database
└── docker-compose.yml
```

## 🆚 **Platform Comparison**

### **TorrentStream vs. Competitors**

| Feature | **TorrentStream** | Seedr.cc | BitTorrent Web | Other Clients |
|---------|-------------------|----------|----------------|---------------|
| **Source Count** | **6 Sources** | 1-2 | 1 | 1 |
| **Health Scoring** | **Advanced Algorithm** | Basic | None | Basic |
| **Self-Hosted** | **✅ Complete Control** | ❌ Cloud Only | ❌ Cloud | ⚠️ Limited |
| **Streaming** | **✅ While Downloading** | ✅ After Download | ⚠️ Limited | ❌ None |
| **Privacy** | **✅ Full Privacy** | ❌ Logs Activity | ❌ Telemetry | ⚠️ Varies |
| **Cost** | **✅ Free Forever** | 💰 Premium Plans | 💰 Subscription | ✅ Free |
| **Mobile Support** | **✅ Responsive Web** | ✅ Mobile App | ⚠️ Limited | ❌ Desktop Only |
| **API Access** | **✅ Full REST API** | ⚠️ Limited | ❌ None | ❌ None |
| **Customization** | **✅ Open Source** | ❌ Closed | ❌ Closed | ⚠️ Limited |

### **Why Choose TorrentStream?**

**🏆 Superior Technology**
- **Multi-source aggregation** with 6 major torrent networks
- **Advanced health scoring** for safe and fast downloads
- **Real-time streaming** without waiting for completion
- **Modern web architecture** with React and Material-UI

**🔒 Privacy & Control**
- **Self-hosted solution** - your data never leaves your server
- **No tracking or analytics** - complete privacy guaranteed
- **Open source transparency** - audit the code yourself
- **VPN friendly** - works perfectly with privacy tools

**💰 Cost Effective**
- **No subscription fees** - free forever
- **No download limits** - unlimited storage and bandwidth
- **No ads** - clean, professional interface
- **No premium features** - everything included

**🛠️ Developer Friendly**
- **Complete API access** for automation and integration
- **Docker ready** - easy deployment anywhere
- **Extensible architecture** - add your own features
- **Active development** - regular updates and improvements

## 🧑‍💻 **Development & Contributing**

### **Adding Features**
```bash
# Backend development
cd server/
npm run dev  # Auto-restart on changes
# Make changes in: index.js, torrentManager.js, searchManager.js

# Frontend development  
cd client/
npm start  # Hot reload enabled
# Make changes in: src/components/, src/context/

# Full stack development
npm run dev  # Runs both simultaneously
```

### **Code Structure**
```
Key Files for Development:
├── server/
│   ├── index.js              # Main API routes
│   ├── searchManager.js      # Multi-source search
│   ├── torrentManager.js     # WebTorrent integration
│   └── database.js           # SQLite operations
├── client/src/
│   ├── components/
│   │   ├── TorrentDiscovery.js   # Search interface
│   │   ├── TorrentList.js        # Download management
│   │   └── VideoPlayer.js        # Streaming component
│   ├── context/TorrentContext.js  # State management
│   └── utils/helpers.js           # Utility functions
```

### **Contributing Guidelines**
1. **Fork** the repository and create a feature branch
2. **Follow** the existing code style and patterns  
3. **Test** your changes thoroughly with the test interfaces
4. **Document** any new features in the README
5. **Submit** a pull request with detailed description
6. **Ensure** all tests pass and no breaking changes

## 🔌 **Complete API Reference**

### **🔍 Discovery & Search Endpoints**
```bash
# Multi-source torrent search
GET /api/search?q={query}&category={cat}&sortBy={sort}&minSeeders={num}
# Example: GET /api/search?q=ubuntu&category=300&minSeeders=50

# Advanced search with health scoring
GET /api/search/advanced?q={query}&minHealth={score}&yearMin={year}
# Example: GET /api/search/advanced?q=movie&minHealth=70&yearMin=2020

# Get trending torrents
GET /api/trending?category={cat}&limit={num}
# Example: GET /api/trending?category=201&limit=20

# Source network statistics
GET /api/sources/stats
# Returns: reliability scores, active sources, categories

# Real-time peer information
GET /api/peers/{infoHash}
# Example: GET /api/peers/9EE38ECC0105ED61B0EF93A875325AFE784B6FB5
```

### **📥 Download Management Endpoints**
```bash
# Add torrent (complete download)
POST /api/torrents
Body: {"magnetLink": "magnet:?xt=urn:btih:..."}

# Add torrent (selective files)
POST /api/torrents/selective
Body: {"magnetLink": "magnet:?...", "selectedFiles": [0,2,5]}

# List all torrents with status
GET /api/torrents

# Get detailed torrent information
GET /api/torrents/{id}
# Returns: metadata, files, progress, peers

# Remove torrent and files
DELETE /api/torrents/{id}

# Force metadata refresh
POST /api/torrents/{id}/refresh
```

### **🎥 Streaming & Media Endpoints**
```bash
# Stream file with range support
GET /api/stream/{torrentId}/{fileIndex}
# Supports HTTP Range requests for seeking

# Preview torrent files (without downloading)
POST /api/preview
Body: {"magnetLink": "magnet:?xt=urn:btih:..."}

# Get torrent file list with streaming status
GET /api/torrents/{id}/files
```

### **📊 System & Health Endpoints**
```bash
# Application health check
GET /api/health
# Returns: status, uptime, performance metrics

# WebSocket events (Socket.io)
- torrent-progress: Real-time download progress
- torrent-metadata: File list and torrent info
- torrent-completed: Download completion notifications
- torrent-error: Error notifications and recovery
- file-selection-changed: Selective download updates
```

## 📊 **Testing Interfaces**

The platform includes comprehensive testing tools for verification:

```bash
# Main Application
open http://localhost:3000                    # Full React interface

# Advanced Testing
open test-advanced-discovery.html            # Multi-source search testing
open test-multi-source-discovery.html        # 6-source network testing  
open test-video-final.html                   # Video streaming testing
open test-frontend-live.html                 # Real-time monitoring
```

## 🎯 **Roadmap & Future Features**

### **Phase 1: Core Platform** ✅ **COMPLETED**
- ✅ Multi-source torrent search (6 sources)
- ✅ Advanced health scoring and filtering
- ✅ Real-time download management
- ✅ Video/audio streaming while downloading
- ✅ Selective file downloading
- ✅ Modern React web interface

### **Phase 2: Enhanced Features** (Planned)
- [ ] User authentication and multi-user support
- [ ] Download scheduling and queuing
- [ ] Mobile app (React Native)
- [ ] Cloud storage integration (S3, Google Drive)
- [ ] Advanced analytics and reporting
- [ ] Theme customization and plugins

### **Phase 3: Enterprise Features** (Future)
- [ ] Load balancing for multiple instances
- [ ] Advanced caching and CDN integration
- [ ] Enterprise user management
- [ ] API rate limiting and quotas
- [ ] Advanced security features
- [ ] White-label deployment options

## 📞 **Support & Community**

### **Getting Help**
- 📖 **Documentation**: This comprehensive README
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/torrentstream/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/torrentstream/discussions)
- 💬 **Community**: [Discord Server](#) (coming soon)

### **Professional Support**
For commercial deployments, consulting, or custom development:
- 📧 **Email**: support@torrentstream.com
- 💼 **Enterprise**: enterprise@torrentstream.com
- 🌐 **Website**: https://torrentstream.com (coming soon)

## ⭐ **Show Your Support**

If TorrentStream helped you, please consider:
- ⭐ **Star this repository** on GitHub
- 🍴 **Fork and contribute** improvements
- 🐛 **Report bugs** and suggest features
- 📢 **Share** with others who might benefit

## 📄 **License**

**MIT License** - Open source and free forever

```
Copyright (c) 2024 TorrentStream

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🎉 **Congratulations!**

You now have a **production-ready, enterprise-grade torrent streaming platform** that:

- **Exceeds Seedr.cc capabilities** with 6-source discovery
- **Provides complete privacy** with self-hosted deployment  
- **Offers advanced features** like health scoring and selective downloads
- **Delivers professional quality** with modern web technologies
- **Costs nothing** and will always be free and open source

**Happy streaming!** 🧲🎥🚀

*Built with ❤️ by the open source community*