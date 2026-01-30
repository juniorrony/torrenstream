// Format bytes to human readable format
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format speed (bytes per second)
export const formatSpeed = (bytesPerSecond) => {
  return formatBytes(bytesPerSecond) + '/s';
};

// Format time duration
export const formatDuration = (seconds) => {
  if (!seconds || seconds === Infinity) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Format percentage
export const formatProgress = (progress) => {
  return Math.round(progress * 100);
};

// Get file type icon
export const getFileTypeIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const videoTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
  const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];

  if (videoTypes.includes(extension)) return '🎥';
  if (audioTypes.includes(extension)) return '🎵';
  if (imageTypes.includes(extension)) return '🖼️';
  if (documentTypes.includes(extension)) return '📄';
  if (archiveTypes.includes(extension)) return '📦';
  
  return '📁';
};

// Check if file is streamable
export const isStreamable = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const streamableTypes = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'mp3', 'wav', 'aac', 'ogg', 'm4a'];
  return streamableTypes.includes(extension);
};

// Validate magnet link
export const isValidMagnetLink = (magnetLink) => {
  if (!magnetLink || typeof magnetLink !== 'string') {
    return false;
  }
  
  const magnetRegex = /^magnet:\?xt=urn:btih:[a-fA-F0-9]{20,40}(&.*)?$/;
  return magnetRegex.test(magnetLink.trim());
};

// Get stream URL
export const getStreamUrl = (torrentId, fileIndex, fileName = '') => {
  const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
  const isMKV = fileName.toLowerCase().endsWith('.mkv');
  const transcodeParam = isMKV ? '?transcode=true' : '';
  return `${baseUrl}/api/stream/${torrentId}/${fileIndex}${transcodeParam}`;
};

// Get torrent status color
export const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#ff9800';
    case 'downloading': return '#2196f3';
    case 'completed': return '#4caf50';
    case 'seeding': return '#8bc34a';
    case 'paused': return '#607d8b';
    case 'error': return '#f44336';
    default: return '#757575';
  }
};

// Get torrent status label
export const getStatusLabel = (status) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'downloading': return 'Downloading';
    case 'completed': return 'Completed';
    case 'seeding': return 'Seeding';
    case 'paused': return 'Paused';
    case 'error': return 'Error';
    default: return 'Unknown';
  }
};