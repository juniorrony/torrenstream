class WatchProgressManager {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';
    this.userId = 'default'; // For now, using default user
    this.saveInterval = 30000; // Save every 30 seconds
    this.saveQueue = new Map(); // Queue for batch saving
    this.isOnline = navigator.onLine;
    this.localStorageKey = 'torrentstream_watch_progress';
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineProgress();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Get watch progress for a specific file
  async getWatchProgress(torrentId, fileIndex) {
    try {
      // Try server first
      if (this.isOnline) {
        const response = await fetch(`${this.baseUrl}/watch-progress/${torrentId}/${fileIndex}`, {
          credentials: 'include',
          headers: {
            'x-user-id': this.userId
          }
        });
        
        if (response.ok) {
          const progress = await response.json();
          return progress;
        }
      }
      
      // Fallback to localStorage
      return this.getLocalProgress(torrentId, fileIndex);
      
    } catch (error) {
      console.error('Error getting watch progress:', error);
      return this.getLocalProgress(torrentId, fileIndex);
    }
  }

  // Save watch progress
  async saveWatchProgress(progressData) {
    const { torrentId, fileIndex, currentTime, duration, fileName, completed = false } = progressData;
    
    // Skip saving if progress is too early or too late
    const progressPercent = (currentTime / duration) * 100;
    if (progressPercent < 5 || progressPercent > 95) {
      return { saved: false, reason: 'Progress outside save range' };
    }

    const progress = {
      torrentId,
      fileIndex,
      currentTime,
      duration,
      fileName,
      completed,
      timestamp: Date.now()
    };

    // Always save to localStorage first (immediate backup)
    this.saveLocalProgress(progress);

    // Add to save queue for server sync
    const key = `${torrentId}_${fileIndex}`;
    this.saveQueue.set(key, progress);

    // Try to save to server if online
    if (this.isOnline) {
      return await this.syncToServer(progress);
    }

    return { saved: true, location: 'local' };
  }

  // Auto-save progress during video playback
  startAutoSave(torrentId, fileIndex, getCurrentTime, getDuration, fileName) {
    // Clear any existing auto-save
    this.stopAutoSave();

    this.autoSaveInterval = setInterval(async () => {
      try {
        const currentTime = getCurrentTime();
        const duration = getDuration();
        
        if (currentTime > 0 && duration > 0) {
          await this.saveWatchProgress({
            torrentId,
            fileIndex,
            currentTime,
            duration,
            fileName
          });
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }, this.saveInterval);

    console.log(`🔄 Started auto-save for ${fileName} (every ${this.saveInterval/1000}s)`);
  }

  // Stop auto-save
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('⏹️ Stopped auto-save');
    }
  }

  // Mark video as completed
  async markCompleted(torrentId, fileIndex) {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseUrl}/watch-progress/${torrentId}/${fileIndex}/complete`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-user-id': this.userId
          }
        });

        if (response.ok) {
          // Also update local storage
          const progress = this.getLocalProgress(torrentId, fileIndex);
          if (progress) {
            progress.completed = true;
            this.saveLocalProgress(progress);
          }
          
          return await response.json();
        }
      }

      // Fallback to local storage
      const progress = this.getLocalProgress(torrentId, fileIndex);
      if (progress) {
        progress.completed = true;
        this.saveLocalProgress(progress);
        return { success: true, location: 'local' };
      }

      return { success: false, error: 'No progress found' };
      
    } catch (error) {
      console.error('Error marking as completed:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete watch progress
  async deleteWatchProgress(torrentId, fileIndex) {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseUrl}/watch-progress/${torrentId}/${fileIndex}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'x-user-id': this.userId
          }
        });

        if (response.ok) {
          // Also remove from local storage
          this.deleteLocalProgress(torrentId, fileIndex);
          return await response.json();
        }
      }

      // Fallback to local storage
      this.deleteLocalProgress(torrentId, fileIndex);
      return { success: true, location: 'local' };
      
    } catch (error) {
      console.error('Error deleting watch progress:', error);
      return { success: false, error: error.message };
    }
  }

  // Get continue watching list
  async getContinueWatching(limit = 10) {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseUrl}/continue-watching?limit=${limit}`, {
          credentials: 'include',
          headers: {
            'x-user-id': this.userId
          }
        });

        if (response.ok) {
          return await response.json();
        }
      }

      // Fallback to local storage
      return this.getLocalContinueWatching(limit);
      
    } catch (error) {
      console.error('Error getting continue watching:', error);
      return this.getLocalContinueWatching(limit);
    }
  }

  // Get watch statistics
  async getWatchStats() {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseUrl}/watch-stats`, {
          credentials: 'include',
          headers: {
            'x-user-id': this.userId
          }
        });

        if (response.ok) {
          return await response.json();
        }
      }

      // Fallback to local storage stats
      return this.getLocalWatchStats();
      
    } catch (error) {
      console.error('Error getting watch stats:', error);
      return this.getLocalWatchStats();
    }
  }

  // Private methods for localStorage operations
  getLocalProgress(torrentId, fileIndex) {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      const key = `${torrentId}_${fileIndex}`;
      return data[key] || null;
    } catch (error) {
      console.error('Error reading local progress:', error);
      return null;
    }
  }

  saveLocalProgress(progress) {
    try {
      const stored = localStorage.getItem(this.localStorageKey) || '{}';
      const data = JSON.parse(stored);
      const key = `${progress.torrentId}_${progress.fileIndex}`;
      
      data[key] = {
        ...progress,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving local progress:', error);
    }
  }

  deleteLocalProgress(torrentId, fileIndex) {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      const key = `${torrentId}_${fileIndex}`;
      delete data[key];
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error deleting local progress:', error);
    }
  }

  getLocalContinueWatching(limit) {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return [];
      
      const data = JSON.parse(stored);
      
      return Object.values(data)
        .filter(item => {
          const progressPercent = (item.currentTime / item.duration) * 100;
          return !item.completed && progressPercent >= 5 && progressPercent < 90;
        })
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, limit)
        .map(item => ({
          ...item,
          resumeText: `Resume at ${this.formatTime(item.currentTime)}`,
          progressText: `${Math.round((item.currentTime / item.duration) * 100)}% watched`,
          timeRemaining: this.formatTime(item.duration - item.currentTime),
          lastWatchedFormatted: new Date(item.lastUpdated).toLocaleDateString()
        }));
    } catch (error) {
      console.error('Error getting local continue watching:', error);
      return [];
    }
  }

  getLocalWatchStats() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (!stored) return { total_watched: 0, completed_count: 0, average_progress: 0, total_watch_time: 0 };
      
      const data = JSON.parse(stored);
      const items = Object.values(data);
      
      const stats = {
        total_watched: items.length,
        completed_count: items.filter(item => item.completed).length,
        average_progress: items.length > 0 ? 
          items.reduce((sum, item) => sum + ((item.currentTime / item.duration) * 100), 0) / items.length : 0,
        total_watch_time: items.reduce((sum, item) => sum + item.currentTime, 0)
      };
      
      return {
        ...stats,
        totalWatchTimeFormatted: this.formatTime(stats.total_watch_time),
        averageProgressFormatted: `${Math.round(stats.average_progress)}%`
      };
    } catch (error) {
      console.error('Error getting local watch stats:', error);
      return { total_watched: 0, completed_count: 0, average_progress: 0, total_watch_time: 0 };
    }
  }

  // Sync offline progress to server when online
  async syncOfflineProgress() {
    if (!this.isOnline || this.saveQueue.size === 0) return;
    
    console.log(`🔄 Syncing ${this.saveQueue.size} offline progress entries to server...`);
    
    for (const [key, progress] of this.saveQueue.entries()) {
      try {
        await this.syncToServer(progress);
        this.saveQueue.delete(key);
      } catch (error) {
        console.error('Error syncing progress:', error);
        // Keep in queue for retry
      }
    }
    
    if (this.saveQueue.size === 0) {
      console.log('✅ All offline progress synced successfully');
    }
  }

  // Sync single progress entry to server
  async syncToServer(progress) {
    try {
      const response = await fetch(`${this.baseUrl}/watch-progress`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify(progress)
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error syncing to server:', error);
      throw error;
    }
  }

  // Format time helper
  formatTime(seconds) {
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

  // Check if resume dialog should be shown
  shouldShowResumeDialog(progress) {
    if (!progress) return false;
    
    const progressPercent = (progress.current_time / progress.duration) * 100;
    return progressPercent >= 5 && progressPercent < 90 && !progress.completed;
  }
}

// Create singleton instance
const watchProgressManager = new WatchProgressManager();
export default watchProgressManager;