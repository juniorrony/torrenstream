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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

      this.db.serialize(() => {
        this.db.run(createTorrentsTable, (err) => {
          if (err) return reject(err);
        });

        this.db.run(createFilesTable, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async addTorrent(torrentData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO torrents (id, name, magnet_link, info_hash, size, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        torrentData.id,
        torrentData.name,
        torrentData.magnetLink,
        torrentData.infoHash,
        torrentData.size || 0,
        torrentData.status || 'pending'
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

  async getAllTorrents() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM torrents ORDER BY created_at DESC';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
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

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default Database;