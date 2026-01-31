import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/torrents.db');
    this.db = null;
  }

  async init() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.dbPath));
      
      this.db = new sqlite3.Database(this.dbPath);
      
      // Create tables
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const createTorrentsTable = `
        CREATE TABLE IF NOT EXISTS torrents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          magnet_link TEXT NOT NULL,
          info_hash TEXT UNIQUE,
          size INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          progress REAL DEFAULT 0,
          download_speed INTEGER DEFAULT 0,
          upload_speed INTEGER DEFAULT 0,
          peers INTEGER DEFAULT 0,
          owner_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      const createFilesTable = `
        CREATE TABLE IF NOT EXISTS torrent_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          torrent_id TEXT,
          file_index INTEGER,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          size INTEGER,
          mime_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (torrent_id) REFERENCES torrents (id) ON DELETE CASCADE
        )
      `;

      const createWatchProgressTable = `
        CREATE TABLE IF NOT EXISTS watch_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          torrent_id TEXT NOT NULL,
          file_index INTEGER NOT NULL,
          user_id TEXT DEFAULT 'default',
          current_time REAL NOT NULL,
          duration REAL NOT NULL,
          file_name TEXT,
          completed BOOLEAN DEFAULT FALSE,
          last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (torrent_id) REFERENCES torrents (id) ON DELETE CASCADE,
          UNIQUE(torrent_id, file_index, user_id)
        )
      `;

      const createWatchProgressIndex = `
        CREATE INDEX IF NOT EXISTS idx_watch_progress_user_updated 
        ON watch_progress (user_id, updated_at DESC)
      `;

      // Users table for authentication
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role TEXT CHECK(role IN ('user', 'moderator', 'admin')) DEFAULT 'user',
          status TEXT CHECK(status IN ('pending', 'active', 'suspended', 'banned')) DEFAULT 'pending',
          email_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255),
          password_reset_token VARCHAR(255),
          password_reset_expires DATETIME,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // User profiles for additional information
      const createUserProfilesTable = `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          display_name VARCHAR(100),
          avatar_url VARCHAR(500),
          bio TEXT,
          preferences JSON,
          storage_quota_gb INTEGER DEFAULT 10,
          storage_used_gb REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      // User sessions for JWT token management
      const createUserSessionsTable = `
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_token VARCHAR(255) NOT NULL,
          refresh_token VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;

      // Audit logs for admin actions
      const createAuditLogsTable = `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50),
          resource_id VARCHAR(100),
          details JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `;

      // Indexes for better performance
      const createUserIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)'
      ];

      this.db.serialize(() => {
        // Create existing tables
        this.db.run(createTorrentsTable, (err) => {
          if (err) return reject(err);
        });

        // Add migration to add owner_id column if it doesn't exist
        this.db.run(`
          ALTER TABLE torrents ADD COLUMN owner_id INTEGER 
          REFERENCES users (id) ON DELETE CASCADE
        `, (err) => {
          // Ignore error if column already exists
          if (err && !err.message.includes('duplicate column')) {
            console.warn('Migration warning:', err.message);
          }
        });

        this.db.run(createFilesTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createWatchProgressTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createWatchProgressIndex, (err) => {
          if (err) return reject(err);
        });

        // Create authentication tables
        this.db.run(createUsersTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createUserProfilesTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createUserSessionsTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createAuditLogsTable, (err) => {
          if (err) return reject(err);
        });

        // Create all indexes
        let indexCount = 0;
        const totalIndexes = createUserIndexes.length;
        
        createUserIndexes.forEach(indexSQL => {
          this.db.run(indexSQL, (err) => {
            if (err) return reject(err);
            indexCount++;
            if (indexCount === totalIndexes) {
              resolve();
            }
          });
        });
      });
    });
  }

  async addTorrent(torrentData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO torrents (id, name, magnet_link, info_hash, size, status, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        torrentData.id,
        torrentData.name,
        torrentData.magnetLink,
        torrentData.infoHash,
        torrentData.size || 0,
        torrentData.status || 'pending',
        torrentData.ownerId || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(torrentData.id);
        }
      });
    });
  }

  async updateTorrent(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      const query = `UPDATE torrents SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getTorrent(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM torrents WHERE id = ?';
      
      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getAllTorrents(ownerId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM torrents';
      const params = [];
      
      if (ownerId !== null) {
        query += ' WHERE owner_id = ?';
        params.push(ownerId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getUserTorrents(userId) {
    return this.getAllTorrents(userId);
  }

  async deleteTorrent(id) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM torrents WHERE id = ?';
      
      this.db.run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async addTorrentFiles(torrentId, files) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO torrent_files (torrent_id, file_index, name, path, size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      this.db.serialize(() => {
        const stmt = this.db.prepare(query);
        
        files.forEach((file, index) => {
          stmt.run([
            torrentId,
            index,
            file.name,
            file.path,
            file.length,
            file.mimeType || 'application/octet-stream'
          ]);
        });
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async getTorrentFiles(torrentId) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM torrent_files WHERE torrent_id = ? ORDER BY file_index';
      
      this.db.all(query, [torrentId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getFileByIndex(torrentId, fileIndex) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM torrent_files WHERE torrent_id = ? AND file_index = ?';
      
      this.db.get(query, [torrentId, fileIndex], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async clearTorrentFiles(torrentId) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM torrent_files WHERE torrent_id = ?';
      
      this.db.run(query, [torrentId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Watch Progress Methods
  async saveWatchProgress(progressData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO watch_progress 
        (torrent_id, file_index, user_id, current_time, duration, file_name, completed, last_watched, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(query, [
        progressData.torrentId,
        progressData.fileIndex,
        progressData.userId || 'default',
        progressData.currentTime,
        progressData.duration,
        progressData.fileName,
        progressData.completed || false
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async getWatchProgress(torrentId, fileIndex, userId = 'default') {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM watch_progress 
        WHERE torrent_id = ? AND file_index = ? AND user_id = ?
      `;
      
      this.db.get(query, [torrentId, fileIndex, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getContinueWatching(userId = 'default', limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          wp.*,
          ROUND((wp.current_time / wp.duration) * 100, 2) as progress_percent,
          t.name as torrent_name,
          tf.name as file_name,
          tf.size as file_size,
          tf.mime_type
        FROM watch_progress wp
        JOIN torrents t ON wp.torrent_id = t.id
        JOIN torrent_files tf ON wp.torrent_id = tf.torrent_id AND wp.file_index = tf.file_index
        WHERE wp.user_id = ? 
          AND wp.completed = FALSE 
          AND wp.duration > 0
          AND (wp.current_time / wp.duration) >= 0.05 
          AND (wp.current_time / wp.duration) < 0.90
        ORDER BY wp.last_watched DESC
        LIMIT ?
      `;
      
      this.db.all(query, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getRecentlyWatched(userId = 'default', limit = 20) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          wp.*,
          ROUND((wp.current_time / wp.duration) * 100, 2) as progress_percent,
          t.name as torrent_name,
          tf.name as file_name,
          tf.size as file_size,
          tf.mime_type
        FROM watch_progress wp
        JOIN torrents t ON wp.torrent_id = t.id
        JOIN torrent_files tf ON wp.torrent_id = tf.torrent_id AND wp.file_index = tf.file_index
        WHERE wp.user_id = ?
        ORDER BY wp.last_watched DESC
        LIMIT ?
      `;
      
      this.db.all(query, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async markAsCompleted(torrentId, fileIndex, userId = 'default') {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE watch_progress 
        SET completed = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE torrent_id = ? AND file_index = ? AND user_id = ?
      `;
      
      this.db.run(query, [torrentId, fileIndex, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async deleteWatchProgress(torrentId, fileIndex, userId = 'default') {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM watch_progress 
        WHERE torrent_id = ? AND file_index = ? AND user_id = ?
      `;
      
      this.db.run(query, [torrentId, fileIndex, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async cleanupOldWatchProgress(daysOld = 30) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM watch_progress 
        WHERE last_watched < datetime('now', '-${daysOld} days')
      `;
      
      this.db.run(query, [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Cleaned up ${this.changes} old watch progress entries`);
          resolve(this.changes);
        }
      });
    });
  }

  async getWatchStats(userId = 'default') {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_watched,
          COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed_count,
          AVG(CASE WHEN duration > 0 THEN (current_time / duration) * 100 ELSE 0 END) as average_progress,
          SUM(current_time) as total_watch_time
        FROM watch_progress 
        WHERE user_id = ?
      `;
      
      this.db.get(query, [userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // User Management Methods
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (username, email, password_hash, role, status, email_verified, email_verification_token)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        userData.username,
        userData.email,
        userData.passwordHash,
        userData.role || 'user',
        userData.status || 'pending',
        userData.emailVerified || false,
        userData.emailVerificationToken || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username: userData.username });
        }
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT u.*, up.display_name, up.avatar_url, up.bio, up.preferences,
               up.storage_quota_gb, up.storage_used_gb
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ?
      `;
      
      this.db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row && row.preferences) {
            try {
              row.preferences = JSON.parse(row.preferences);
            } catch (e) {
              row.preferences = {};
            }
          }
          resolve(row);
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      
      this.db.get(query, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateUser(id, updates) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async deleteUser(id) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM users WHERE id = ?';
      
      this.db.run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getAllUsers(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT u.*, up.display_name, up.avatar_url,
               COUNT(DISTINCT wp.id) as videos_watched,
               MAX(u.last_login) as last_activity
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN watch_progress wp ON u.id = CAST(wp.user_id AS INTEGER)
      `;
      
      const conditions = [];
      const params = [];
      
      if (filters.role) {
        conditions.push('u.role = ?');
        params.push(filters.role);
      }
      
      if (filters.status) {
        conditions.push('u.status = ?');
        params.push(filters.status);
      }
      
      if (filters.search) {
        conditions.push('(u.username LIKE ? OR u.email LIKE ? OR up.display_name LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY u.id ORDER BY u.created_at DESC';
      
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // User Profile Methods
  async createUserProfile(userId, profileData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO user_profiles (user_id, display_name, avatar_url, bio, preferences, storage_quota_gb)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const preferences = profileData.preferences ? JSON.stringify(profileData.preferences) : '{}';
      
      this.db.run(query, [
        userId,
        profileData.displayName || null,
        profileData.avatarUrl || null,
        profileData.bio || null,
        preferences,
        profileData.storageQuotaGb || 10
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  async updateUserProfile(userId, updates) {
    return new Promise((resolve, reject) => {
      if (updates.preferences) {
        updates.preferences = JSON.stringify(updates.preferences);
      }
      
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(userId);

      const query = `UPDATE user_profiles SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
      
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Session Management Methods
  async createSession(sessionData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO user_sessions (user_id, session_token, refresh_token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        sessionData.userId,
        sessionData.sessionToken,
        sessionData.refreshToken,
        sessionData.ipAddress,
        sessionData.userAgent,
        sessionData.expiresAt
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  async getSessionByToken(sessionToken) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT s.*, u.username, u.email, u.role, u.status
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND s.expires_at > datetime('now')
      `;
      
      this.db.get(query, [sessionToken], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async deleteSession(sessionToken) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM user_sessions WHERE session_token = ?';
      
      this.db.run(query, [sessionToken], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async deleteExpiredSessions() {
    return new Promise((resolve, reject) => {
      const query = "DELETE FROM user_sessions WHERE expires_at <= datetime('now')";
      
      this.db.run(query, [], function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Cleaned up ${this.changes} expired sessions`);
          resolve(this.changes);
        }
      });
    });
  }

  // Audit Log Methods
  async logAction(actionData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const details = actionData.details ? JSON.stringify(actionData.details) : null;
      
      this.db.run(query, [
        actionData.userId,
        actionData.action,
        actionData.resourceType || null,
        actionData.resourceId || null,
        details,
        actionData.ipAddress || null,
        actionData.userAgent || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  async getAuditLogs(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT al.*, u.username, u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (filters.userId) {
        conditions.push('al.user_id = ?');
        params.push(filters.userId);
      }
      
      if (filters.action) {
        conditions.push('al.action = ?');
        params.push(filters.action);
      }
      
      if (filters.resourceType) {
        conditions.push('al.resource_type = ?');
        params.push(filters.resourceType);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY al.created_at DESC';
      
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }
      
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse JSON details
          const processedRows = rows.map(row => {
            if (row.details) {
              try {
                row.details = JSON.parse(row.details);
              } catch (e) {
                row.details = {};
              }
            }
            return row;
          });
          resolve(processedRows || []);
        }
      });
    });
  }

  // Admin Statistics Methods
  async getAdminStats() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
          (SELECT COUNT(*) FROM users WHERE created_at > datetime('now', '-7 days')) as new_users_week,
          (SELECT COUNT(*) FROM torrents) as total_torrents,
          (SELECT COUNT(*) FROM watch_progress) as total_views,
          (SELECT COUNT(*) FROM user_sessions WHERE expires_at > datetime('now')) as active_sessions
      `;
      
      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get user count with filters
  async getUserCount(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `SELECT COUNT(*) as count FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE 1=1`;
      const params = [];

      if (filters.role) {
        query += ` AND u.role = ?`;
        params.push(filters.role);
      }

      if (filters.status) {
        query += ` AND u.status = ?`;
        params.push(filters.status);
      }

      if (filters.search) {
        query += ` AND (u.username LIKE ? OR u.email LIKE ? OR up.display_name LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count || 0);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default Database;