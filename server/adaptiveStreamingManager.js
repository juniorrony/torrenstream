import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export default class AdaptiveStreamingManager {
  constructor() {
    // Quality profiles with different resolutions and bitrates
    this.qualityProfiles = {
      '240p': {
        resolution: '426x240',
        videoBitrate: '400k',
        audioBitrate: '64k',
        maxrate: '500k',
        bufsize: '1000k',
        profile: 'baseline',
        level: '3.0',
        keyframes: 30
      },
      '360p': {
        resolution: '640x360', 
        videoBitrate: '800k',
        audioBitrate: '96k',
        maxrate: '1000k',
        bufsize: '2000k',
        profile: 'baseline',
        level: '3.1',
        keyframes: 60
      },
      '480p': {
        resolution: '854x480',
        videoBitrate: '1200k',
        audioBitrate: '128k', 
        maxrate: '1500k',
        bufsize: '3000k',
        profile: 'main',
        level: '3.1',
        keyframes: 60
      },
      '720p': {
        resolution: '1280x720',
        videoBitrate: '2500k',
        audioBitrate: '128k',
        maxrate: '3000k', 
        bufsize: '6000k',
        profile: 'high',
        level: '3.1',
        keyframes: 60
      },
      '1080p': {
        resolution: '1920x1080',
        videoBitrate: '5000k',
        audioBitrate: '192k',
        maxrate: '6000k',
        bufsize: '12000k',
        profile: 'high',
        level: '4.0',
        keyframes: 60
      }
    };

    // HLS segment settings
    this.hlsSettings = {
      segmentDuration: 6, // seconds
      playlistLength: 5,  // number of segments to keep in playlist
      segmentPrefix: 'segment'
    };

    // Active streaming sessions
    this.activeSessions = new Map();
    
    // Cleanup old sessions every 5 minutes
    setInterval(() => this.cleanupOldSessions(), 5 * 60 * 1000);
  }

  // Generate session ID for streaming
  generateSessionId(torrentId, fileIndex) {
    return crypto.createHash('md5')
      .update(`${torrentId}-${fileIndex}-${Date.now()}`)
      .digest('hex');
  }

  // Detect source video resolution and select appropriate quality profiles
  async detectSourceQuality(filePath) {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-select_streams', 'v:0',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            const videoStream = info.streams[0];
            
            if (videoStream) {
              const width = videoStream.width || 0;
              const height = videoStream.height || 0;
              const duration = parseFloat(videoStream.duration) || 0;
              const bitrate = parseInt(videoStream.bit_rate) || 0;

              // Determine appropriate quality levels based on source
              const availableQualities = this.getAvailableQualities(width, height);

              resolve({
                width,
                height, 
                duration,
                bitrate,
                availableQualities,
                codec: videoStream.codec_name
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Error parsing ffprobe output:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  // Get available quality levels based on source resolution
  getAvailableQualities(sourceWidth, sourceHeight) {
    const qualities = [];
    
    // Only include qualities that are equal or smaller than source
    Object.keys(this.qualityProfiles).forEach(quality => {
      const profile = this.qualityProfiles[quality];
      const [profileWidth, profileHeight] = profile.resolution.split('x').map(Number);
      
      if (profileWidth <= sourceWidth && profileHeight <= sourceHeight) {
        qualities.push(quality);
      }
    });

    // Always include at least 360p for compatibility
    if (qualities.length === 0) {
      qualities.push('360p');
    }

    return qualities.sort((a, b) => {
      const [aWidth] = this.qualityProfiles[a].resolution.split('x').map(Number);
      const [bWidth] = this.qualityProfiles[b].resolution.split('x').map(Number);
      return bWidth - aWidth; // Sort highest to lowest
    });
  }

  // Generate HLS master playlist
  generateMasterPlaylist(sessionId, availableQualities, baseUrl) {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    availableQualities.forEach(quality => {
      const profile = this.qualityProfiles[quality];
      const [width, height] = profile.resolution.split('x').map(Number);
      const bandwidth = parseInt(profile.videoBitrate) * 1000 + parseInt(profile.audioBitrate) * 1000;

      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height},CODECS="avc1.42001e,mp4a.40.2"\n`;
      playlist += `${baseUrl}/playlist/${sessionId}/${quality}.m3u8\n\n`;
    });

    return playlist;
  }

  // Generate quality-specific playlist
  generateQualityPlaylist(segmentFiles, isLive = true) {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n';
    playlist += `#EXT-X-TARGETDURATION:${this.hlsSettings.segmentDuration}\n`;
    
    if (!isLive) {
      playlist += '#EXT-X-PLAYLIST-TYPE:VOD\n';
    }
    
    let sequenceNumber = Math.max(0, segmentFiles.length - this.hlsSettings.playlistLength);
    playlist += `#EXT-X-MEDIA-SEQUENCE:${sequenceNumber}\n\n`;

    // Add segments (keep only recent segments for live streaming)
    const recentSegments = isLive ? 
      segmentFiles.slice(-this.hlsSettings.playlistLength) : 
      segmentFiles;

    recentSegments.forEach(segment => {
      playlist += `#EXTINF:${this.hlsSettings.segmentDuration}.0,\n`;
      playlist += `${segment.name}\n`;
    });

    if (!isLive) {
      playlist += '#EXT-X-ENDLIST\n';
    }

    return playlist;
  }

  // Start adaptive streaming session
  async startAdaptiveStream(torrentId, fileIndex, filePath) {
    const sessionId = this.generateSessionId(torrentId, fileIndex);
    
    // Detect source quality
    const sourceInfo = await this.detectSourceQuality(filePath);
    if (!sourceInfo) {
      throw new Error('Could not detect source video information');
    }

    // Create session
    const session = {
      sessionId,
      torrentId,
      fileIndex,
      filePath,
      sourceInfo,
      qualities: sourceInfo.availableQualities,
      segments: {}, // quality -> segment list
      activeTranscoders: new Map(),
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    // Initialize segment storage for each quality
    sourceInfo.availableQualities.forEach(quality => {
      session.segments[quality] = [];
    });

    this.activeSessions.set(sessionId, session);

    console.log(`🎬 Started adaptive streaming session: ${sessionId}`);
    console.log(`📊 Source: ${sourceInfo.width}x${sourceInfo.height}, Available: ${sourceInfo.availableQualities.join(', ')}`);

    return {
      sessionId,
      qualities: sourceInfo.availableQualities,
      sourceInfo
    };
  }

  // Get FFmpeg arguments for specific quality
  getTranscodeArgs(filePath, quality, segmentPath, segmentDuration) {
    const profile = this.qualityProfiles[quality];
    
    return [
      '-i', filePath,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-profile:v', profile.profile,
      '-level', profile.level,
      '-vf', `scale=${profile.resolution}:flags=lanczos`,
      '-b:v', profile.videoBitrate,
      '-maxrate', profile.maxrate,
      '-bufsize', profile.bufsize,
      '-g', profile.keyframes.toString(),
      '-keyint_min', profile.keyframes.toString(),
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', profile.audioBitrate,
      '-ar', '44100',
      '-ac', '2',
      '-f', 'hls',
      '-hls_time', segmentDuration.toString(),
      '-hls_list_size', this.hlsSettings.playlistLength.toString(),
      '-hls_segment_filename', `${segmentPath}/${this.hlsSettings.segmentPrefix}_%03d.ts`,
      '-hls_flags', 'delete_segments+round_durations',
      '-y',
      `${segmentPath}/playlist.m3u8`
    ];
  }

  // Start transcoding for specific quality
  async startQualityTranscode(sessionId, quality) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if already transcoding this quality
    if (session.activeTranscoders.has(quality)) {
      return;
    }

    // Create temporary directory for segments
    const segmentPath = path.join('/tmp', `hls_${sessionId}_${quality}`);
    await fs.ensureDir(segmentPath);

    const args = this.getTranscodeArgs(
      session.filePath,
      quality,
      segmentPath,
      this.hlsSettings.segmentDuration
    );

    console.log(`🔄 Starting ${quality} transcoding for session ${sessionId}`);
    
    const ffmpeg = spawn('ffmpeg', args);
    
    // Store transcoder info
    session.activeTranscoders.set(quality, {
      process: ffmpeg,
      segmentPath,
      startTime: Date.now()
    });

    // Handle transcoding progress
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('frame=')) {
        // Extract progress info if needed
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          // Could emit progress events here
        }
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(`📊 ${quality} transcoding finished for session ${sessionId} (code: ${code})`);
      session.activeTranscoders.delete(quality);
    });

    ffmpeg.on('error', (error) => {
      console.error(`❌ ${quality} transcoding error for session ${sessionId}:`, error);
      session.activeTranscoders.delete(quality);
    });

    return segmentPath;
  }

  // Get session info
  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastAccessed = Date.now();
    }
    return session;
  }

  // Stop session and cleanup
  async stopSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    console.log(`🛑 Stopping adaptive streaming session: ${sessionId}`);

    // Kill all active transcoders
    session.activeTranscoders.forEach((transcoder, quality) => {
      if (transcoder.process && !transcoder.process.killed) {
        console.log(`🔨 Killing ${quality} transcoder`);
        transcoder.process.kill('SIGTERM');
        
        // Force kill after 3 seconds
        setTimeout(() => {
          if (!transcoder.process.killed) {
            transcoder.process.kill('SIGKILL');
          }
        }, 3000);
      }

      // Cleanup segment files
      if (transcoder.segmentPath) {
        fs.remove(transcoder.segmentPath).catch(console.error);
      }
    });

    this.activeSessions.delete(sessionId);
  }

  // Cleanup old sessions
  cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    this.activeSessions.forEach((session, sessionId) => {
      if (now - session.lastAccessed > maxAge) {
        console.log(`🧹 Cleaning up old session: ${sessionId}`);
        this.stopSession(sessionId);
      }
    });
  }

  // Get available segment files for quality
  async getSegmentList(sessionId, quality) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    const transcoder = session.activeTranscoders.get(quality);
    if (!transcoder) {
      return null;
    }

    try {
      const segmentDir = transcoder.segmentPath;
      const files = await fs.readdir(segmentDir);
      
      const segments = files
        .filter(file => file.endsWith('.ts'))
        .sort()
        .map(file => ({
          name: file,
          path: path.join(segmentDir, file)
        }));

      return segments;
    } catch (error) {
      console.error('Error reading segment list:', error);
      return null;
    }
  }

  // Get statistics for monitoring
  getStats() {
    const sessions = Array.from(this.activeSessions.values());
    const totalTranscoders = sessions.reduce((total, session) => 
      total + session.activeTranscoders.size, 0
    );

    return {
      activeSessions: sessions.length,
      totalTranscoders,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        qualities: session.qualities,
        activeTranscoders: Array.from(session.activeTranscoders.keys()),
        uptime: Date.now() - session.createdAt,
        lastAccessed: session.lastAccessed
      }))
    };
  }
}