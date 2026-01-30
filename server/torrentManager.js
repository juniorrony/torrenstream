import WebTorrent from 'webtorrent';
import path from 'path';
import fs from 'fs-extra';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TorrentManager {
  constructor(io, database) {
    this.client = new WebTorrent();
    this.io = io;
    this.db = database;
    this.torrents = new Map();
    this.pausedTorrents = new Set(); // Track manually paused torrents
    this.downloadPath = path.join(__dirname, '../downloads');
    
    // Ensure download directory exists
    fs.ensureDirSync(this.downloadPath);
    
    // Setup client event handlers
    this.setupClientHandlers();
  }

  setupClientHandlers() {
    this.client.on('error', (err) => {
      console.error('WebTorrent client error:', err);
    });

    this.client.on('torrent', (torrent) => {
      console.log('Torrent added:', torrent.name);
      this.setupTorrentHandlers(torrent);
    });
  }

  setupTorrentHandlers(torrent) {
    const torrentId = this.getTorrentId(torrent.infoHash);
    
    torrent.on('metadata', async () => {
      console.log(`Metadata received for: ${torrent.name}`);
      
      try {
        // Update torrent info in database
        await this.db.updateTorrent(torrentId, {
          name: torrent.name,
          size: torrent.length,
          status: 'downloading'
        });

        // Add file information to database
        const files = torrent.files.map((file, index) => ({
          name: file.name,
          path: file.path,
          length: file.length,
          mimeType: mime.lookup(file.name) || 'application/octet-stream'
        }));

        // Clear existing files first to prevent duplicates
        await this.db.clearTorrentFiles(torrentId);
        await this.db.addTorrentFiles(torrentId, files);

        // Emit update to clients
        this.io.emit('torrent-metadata', {
          id: torrentId,
          name: torrent.name,
          size: torrent.length,
          files: files
        });

      } catch (error) {
        console.error('Error handling metadata:', error);
      }
    });

    torrent.on('download', async () => {
      const progress = torrent.progress;
      const downloadSpeed = torrent.downloadSpeed;
      const uploadSpeed = torrent.uploadSpeed;
      const numPeers = torrent.numPeers;

      try {
        // Check if torrent is manually paused
        const isPaused = this.pausedTorrents.has(torrentId);
        let status;
        
        if (isPaused) {
          status = 'paused';
          // Re-pause if it somehow resumed automatically
          if (!torrent.paused) {
            torrent.pause();
            console.log(`Re-pausing auto-resumed torrent: ${torrent.name}`);
          }
        } else {
          status = progress === 1 ? 'completed' : 'downloading';
        }

        await this.db.updateTorrent(torrentId, {
          progress: progress,
          download_speed: downloadSpeed,
          upload_speed: uploadSpeed,
          peers: numPeers,
          status: status
        });

        // Emit progress update to clients
        this.io.emit('torrent-progress', {
          id: torrentId,
          progress: progress,
          downloadSpeed: downloadSpeed,
          uploadSpeed: uploadSpeed,
          peers: numPeers,
          status: status
        });

      } catch (error) {
        console.error('Error updating progress:', error);
      }
    });

    torrent.on('done', async () => {
      console.log(`Torrent completed: ${torrent.name}`);
      
      try {
        // Stop the torrent to prevent further seeding/uploading
        torrent.pause();
        console.log(`Stopped seeding for completed torrent: ${torrent.name}`);

        await this.db.updateTorrent(torrentId, {
          status: 'completed',
          progress: 1
        });

        this.io.emit('torrent-completed', {
          id: torrentId,
          name: torrent.name,
          stopped: true
        });

      } catch (error) {
        console.error('Error marking torrent as complete:', error);
      }
    });

    torrent.on('error', async (err) => {
      console.error(`Torrent error for ${torrent.name}:`, err);
      
      try {
        await this.db.updateTorrent(torrentId, {
          status: 'error'
        });

        this.io.emit('torrent-error', {
          id: torrentId,
          error: err.message
        });

      } catch (error) {
        console.error('Error updating torrent status:', error);
      }
    });
  }

  async addTorrent(magnetLink) {
    const torrentId = uuidv4();
    
    try {
      // Add to database first
      await this.db.addTorrent({
        id: torrentId,
        name: 'Loading...',
        magnetLink: magnetLink,
        infoHash: this.extractInfoHash(magnetLink),
        status: 'pending'
      });

      // Add to WebTorrent client
      const torrent = this.client.add(magnetLink, {
        path: this.downloadPath
      });

      // Store mapping
      this.torrents.set(torrentId, torrent);
      this.torrents.set(torrent.infoHash, torrentId);

      return torrentId;

    } catch (error) {
      console.error('Error adding torrent:', error);
      throw error;
    }
  }

  async removeTorrent(torrentId, deleteFiles = false) {
    try {
      const torrent = this.torrents.get(torrentId);
      const torrentData = await this.db.getTorrent(torrentId);
      
      if (torrent) {
        // Remove from WebTorrent client
        this.client.remove(torrent, { destroyStore: deleteFiles });
        
        // Clean up mappings
        this.torrents.delete(torrentId);
        this.torrents.delete(torrent.infoHash);
        
        // Clean up pause tracking
        this.pausedTorrents.delete(torrentId);
      }

      // Delete files from filesystem if requested
      if (deleteFiles && torrentData) {
        try {
          // First try to delete as a directory (multi-file torrents)
          const torrentDirPath = path.join(this.downloadPath, torrentData.name);
          if (await fs.pathExists(torrentDirPath)) {
            const stat = await fs.stat(torrentDirPath);
            if (stat.isDirectory()) {
              await fs.remove(torrentDirPath);
              console.log(`Deleted torrent directory: ${torrentDirPath}`);
            } else {
              await fs.remove(torrentDirPath);
              console.log(`Deleted torrent file: ${torrentDirPath}`);
            }
          } else {
            // If directory doesn't exist, try to find and delete individual files
            const files = await this.db.getTorrentFiles(torrentData.id);
            let deletedCount = 0;
            
            for (const file of files || []) {
              // Try different possible paths
              const possiblePaths = [
                path.join(this.downloadPath, file.name),
                path.join(this.downloadPath, torrentData.name, file.name),
                path.join(this.downloadPath, file.path)
              ];
              
              for (const filePath of possiblePaths) {
                if (await fs.pathExists(filePath)) {
                  await fs.remove(filePath);
                  console.log(`Deleted file: ${filePath}`);
                  deletedCount++;
                  break;
                }
              }
            }
            
            if (deletedCount === 0) {
              console.log(`No files found to delete for torrent: ${torrentData.name}`);
            } else {
              console.log(`Deleted ${deletedCount} files for torrent: ${torrentData.name}`);
            }
          }
        } catch (fileError) {
          console.error('Error deleting torrent files:', fileError);
        }
      }

      // Remove from database
      await this.db.deleteTorrent(torrentId);

      // Emit removal to clients
      this.io.emit('torrent-removed', { 
        id: torrentId, 
        filesDeleted: deleteFiles 
      });

    } catch (error) {
      console.error('Error removing torrent:', error);
      throw error;
    }
  }

  async pauseTorrent(torrentId) {
    try {
      const torrent = this.torrents.get(torrentId);
      
      if (!torrent) {
        throw new Error('Torrent not found');
      }

      // Mark as manually paused
      this.pausedTorrents.add(torrentId);

      // Pause the torrent
      torrent.pause();

      // Update status in database
      await this.db.updateTorrent(torrentId, {
        status: 'paused'
      });

      // Emit pause event to clients
      this.io.emit('torrent-paused', { id: torrentId });

      console.log(`Torrent paused: ${torrent.name} (manually paused)`);

    } catch (error) {
      console.error('Error pausing torrent:', error);
      throw error;
    }
  }

  async resumeTorrent(torrentId) {
    try {
      const torrent = this.torrents.get(torrentId);
      
      if (!torrent) {
        throw new Error('Torrent not found');
      }

      // Remove from manually paused set
      this.pausedTorrents.delete(torrentId);

      // Resume the torrent
      torrent.resume();

      // Update status in database
      let newStatus;
      if (torrent.progress === 1) {
        newStatus = 'seeding'; // Show as seeding when completed torrent is manually resumed
        console.log(`Torrent is now seeding: ${torrent.name}`);
      } else {
        newStatus = 'downloading';
      }

      await this.db.updateTorrent(torrentId, {
        status: newStatus
      });

      // Emit resume event to clients
      this.io.emit('torrent-resumed', { id: torrentId, status: newStatus });

      console.log(`Torrent resumed: ${torrent.name} (manually resumed, status: ${newStatus})`);

    } catch (error) {
      console.error('Error resuming torrent:', error);
      throw error;
    }
  }

  async streamFile(torrentId, fileIndex, range) {
    try {
      const torrent = this.torrents.get(torrentId);
      
      if (!torrent || !torrent.files || !torrent.files[fileIndex]) {
        return null;
      }

      const file = torrent.files[fileIndex];
      const fileSize = file.length;
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';

      let start = 0;
      let end = fileSize - 1;

      // Parse range header
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      }

      // Create stream
      const fileStream = file.createReadStream({ start, end });

      return {
        fileStream,
        start,
        end,
        fileSize,
        mimeType,
        fileName: file.name
      };

    } catch (error) {
      console.error('Error creating file stream:', error);
      throw error;
    }
  }

  getTorrentId(infoHash) {
    return this.torrents.get(infoHash);
  }

  // Get all active torrents for debugging
  getActiveTorrents() {
    return Array.from(this.torrents.entries()).filter(([key, value]) => typeof key === 'string' && key.length > 20);
  }

  // Force update torrent metadata if it's missing
  async updateTorrentMetadata(torrentId) {
    const torrent = this.torrents.get(torrentId);
    if (!torrent) return null;

    try {
      // Update torrent info in database if metadata is available
      if (torrent.name && torrent.name !== 'Loading...') {
        await this.db.updateTorrent(torrentId, {
          name: torrent.name,
          size: torrent.length,
          status: torrent.done ? 'completed' : 'downloading'
        });

        // Add/update file information
        if (torrent.files && torrent.files.length > 0) {
          const files = torrent.files.map((file, index) => ({
            name: file.name,
            path: file.path,
            length: file.length,
            mimeType: mime.lookup(file.name) || 'application/octet-stream'
          }));

          // Clear existing files first
          await this.db.clearTorrentFiles(torrentId);
          await this.db.addTorrentFiles(torrentId, files);

          return {
            id: torrentId,
            name: torrent.name,
            size: torrent.length,
            files: files,
            progress: torrent.progress,
            status: torrent.done ? 'completed' : 'downloading'
          };
        }
      }
    } catch (error) {
      console.error('Error updating torrent metadata:', error);
    }
    
    return null;
  }

  extractInfoHash(magnetLink) {
    const match = magnetLink.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
    return match ? match[1].toLowerCase() : null;
  }

  // Restore torrent from database on startup
  async restoreTorrent(torrentData) {
    try {
      console.log(`Restoring torrent: ${torrentData.magnet_link}`);
      
      // Add to WebTorrent client
      const torrent = this.client.add(torrentData.magnet_link, {
        path: this.downloadPath
      });

      // Store mapping
      this.torrents.set(torrentData.id, torrent);
      this.torrents.set(torrent.infoHash, torrentData.id);

      // Set up handlers
      this.setupTorrentHandlers(torrent);

      return torrentData.id;
    } catch (error) {
      console.error('Error restoring torrent:', error);
      throw error;
    }
  }

  // Get metadata from downloaded files if available
  async getMetadataFromFiles(torrentId) {
    try {
      const torrentData = await this.db.getTorrent(torrentId);
      if (!torrentData) return null;

      // Check if files exist in the download directory
      const downloadDir = path.join(this.downloadPath);
      const files = await fs.readdir(downloadDir);
      
      let torrentDir = null;
      for (const file of files) {
        const fullPath = path.join(downloadDir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          torrentDir = file;
          break;
        }
      }

      if (torrentDir) {
        const torrentDirPath = path.join(downloadDir, torrentDir);
        const torrentFiles = await this.getFilesRecursively(torrentDirPath);
        
        let totalSize = 0;
        const fileList = [];
        
        for (let i = 0; i < torrentFiles.length; i++) {
          const file = torrentFiles[i];
          const stat = await fs.stat(file);
          const relativePath = path.relative(torrentDirPath, file);
          const fileName = path.basename(file);
          
          totalSize += stat.size;
          fileList.push({
            name: fileName,
            path: relativePath,
            length: stat.size,
            mimeType: mime.lookup(fileName) || 'application/octet-stream'
          });
        }

        // Update database with discovered metadata
        await this.db.updateTorrent(torrentId, {
          name: torrentDir,
          size: totalSize,
          status: 'completed'
        });

        // Clear and add files
        await this.db.clearTorrentFiles(torrentId);
        await this.db.addTorrentFiles(torrentId, fileList);

        return {
          id: torrentId,
          name: torrentDir,
          size: totalSize,
          files: fileList,
          status: 'completed'
        };
      }
    } catch (error) {
      console.error('Error getting metadata from files:', error);
    }
    
    return null;
  }

  async getFilesRecursively(dir) {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await this.getFilesRecursively(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Stream from file system when WebTorrent stream is not available
  async streamFromFileSystem(torrentId, fileIndex, range) {
    try {
      const torrentData = await this.db.getTorrent(torrentId);
      if (!torrentData) return null;

      const files = await this.db.getTorrentFiles(torrentId);
      const file = files.find(f => f.file_index === fileIndex);
      
      if (!file) return null;

      // Construct file path - handle both single files and folder structures
      let filePath;
      const possiblePaths = [
        // Try as single file directly in downloads
        path.join(this.downloadPath, torrentData.name),
        // Try as file in torrent directory
        path.join(this.downloadPath, torrentData.name, file.path),
        // Try with just the file name
        path.join(this.downloadPath, file.name),
        // Try the full relative path
        path.join(this.downloadPath, file.path)
      ];
      
      // Find the file that actually exists
      for (const testPath of possiblePaths) {
        if (await fs.pathExists(testPath)) {
          filePath = testPath;
          console.log(`Found file at: ${filePath}`);
          break;
        }
      }
      
      // Check if we found a valid file path
      if (!filePath) {
        console.log(`File not found in any of these paths:`, possiblePaths);
        return null;
      }

      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      let mimeType = mime.lookup(file.name) || 'application/octet-stream';
      
      // Fix MKV MIME type for better browser compatibility
      if (file.name.toLowerCase().endsWith('.mkv')) {
        mimeType = 'video/x-matroska';
      }

      let start = 0;
      let end = fileSize - 1;

      // Parse range header
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      }

      return {
        filePath,
        start,
        end,
        fileSize,
        mimeType
      };

    } catch (error) {
      console.error('Error creating file system stream:', error);
      return null;
    }
  }

  // Add torrent with selective file downloading
  async addSelectiveTorrent(magnetLink, selectedFiles = []) {
    const torrentId = uuidv4();
    
    try {
      // Add to database first
      await this.db.addTorrent({
        id: torrentId,
        name: 'Loading...',
        magnetLink: magnetLink,
        infoHash: this.extractInfoHash(magnetLink),
        status: 'pending'
      });

      // Add to WebTorrent client
      const torrent = this.client.add(magnetLink, {
        path: this.downloadPath
      });

      // Store mapping
      this.torrents.set(torrentId, torrent);
      this.torrents.set(torrent.infoHash, torrentId);

      // Set up selective downloading when metadata is available
      torrent.on('metadata', () => {
        console.log(`Metadata received for selective torrent: ${torrent.name}`);
        
        // If specific files were selected, deselect all others
        if (selectedFiles.length > 0) {
          torrent.files.forEach((file, index) => {
            if (selectedFiles.includes(index)) {
              file.select();
              console.log(`Selected file: ${file.name}`);
            } else {
              file.deselect();
              console.log(`Deselected file: ${file.name}`);
            }
          });
        }
      });

      // Set up handlers
      this.setupTorrentHandlers(torrent);

      return torrentId;

    } catch (error) {
      console.error('Error adding selective torrent:', error);
      throw error;
    }
  }

  // Get torrent file list with download status
  async getTorrentFilesWithStatus(torrentId) {
    try {
      const torrent = this.torrents.get(torrentId);
      if (!torrent || !torrent.files) return null;

      return torrent.files.map((file, index) => ({
        index,
        name: file.name,
        path: file.path,
        size: file.length,
        downloaded: file.downloaded,
        progress: file.progress,
        selected: file.selected,
        streamable: this.isStreamableFile(file.name),
        mimeType: mime.lookup(file.name) || 'application/octet-stream'
      }));

    } catch (error) {
      console.error('Error getting torrent files with status:', error);
      return null;
    }
  }

  // Toggle file selection for downloading
  async toggleFileSelection(torrentId, fileIndex, selected) {
    try {
      const torrent = this.torrents.get(torrentId);
      if (!torrent || !torrent.files || !torrent.files[fileIndex]) {
        throw new Error('Torrent or file not found');
      }

      const file = torrent.files[fileIndex];
      
      if (selected) {
        file.select();
        console.log(`Selected file: ${file.name}`);
      } else {
        file.deselect();
        console.log(`Deselected file: ${file.name}`);
      }

      // Emit update to clients
      this.io.emit('file-selection-changed', {
        torrentId,
        fileIndex,
        selected,
        fileName: file.name
      });

      return true;

    } catch (error) {
      console.error('Error toggling file selection:', error);
      throw error;
    }
  }

  isStreamableFile(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const streamableTypes = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'mp3', 'wav', 'aac', 'ogg', 'm4a'];
    return streamableTypes.includes(extension);
  }

  cleanup() {
    console.log('Cleaning up torrent client...');
    this.client.destroy();
  }
}

export default TorrentManager;