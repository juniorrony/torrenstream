import React, { createContext, useContext, useReducer, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../utils/api';

const TorrentContext = createContext();

const initialState = {
  torrents: [],
  loading: false,
  connected: false
};

const torrentReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    
    case 'SET_TORRENTS':
      return { ...state, torrents: action.payload, loading: false };
    
    case 'ADD_TORRENT':
      return { 
        ...state, 
        torrents: [action.payload, ...state.torrents] 
      };
    
    case 'UPDATE_TORRENT':
      return {
        ...state,
        torrents: state.torrents.map(torrent =>
          torrent.id === action.payload.id
            ? { ...torrent, ...action.payload }
            : torrent
        )
      };
    
    case 'REMOVE_TORRENT':
      return {
        ...state,
        torrents: state.torrents.filter(torrent => torrent.id !== action.payload)
      };
    
    default:
      return state;
  }
};

export const TorrentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(torrentReducer, initialState);

  useEffect(() => {
    // Load existing torrents immediately
    loadTorrents();
    
    // Set connected to true for demo mode (no real websocket needed for testing)
    dispatch({ type: 'SET_CONNECTED', payload: true });
    
    // Set up periodic refresh to update torrent status
    const refreshInterval = setInterval(() => {
      loadTorrents();
    }, 3000); // Refresh every 3 seconds
    
    // Optional: Try to initialize socket connection (will fail gracefully in test mode)
    try {
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5000';
      
      const socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5
      });
      
      socket.on('connect', () => {
        console.log('Socket connected');
        dispatch({ type: 'SET_CONNECTED', payload: true });
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        dispatch({ type: 'SET_CONNECTED', payload: false });
      });

      socket.on('connect_error', (error) => {
        console.log('Socket connection failed, retrying...:', error.message);
        // Still show as connected since API works
        dispatch({ type: 'SET_CONNECTED', payload: true });
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        dispatch({ type: 'SET_CONNECTED', payload: true });
      });

      socket.on('reconnect_error', (error) => {
        console.log('Socket reconnection failed:', error.message);
      });

      socket.on('reconnect_failed', () => {
        console.log('Socket reconnection failed permanently, using API polling');
        dispatch({ type: 'SET_CONNECTED', payload: true }); // Keep UI functional
      });

      socket.on('torrent-metadata', (data) => {
        dispatch({ type: 'UPDATE_TORRENT', payload: data });
      });

      socket.on('torrent-progress', (data) => {
        dispatch({ type: 'UPDATE_TORRENT', payload: data });
      });

      socket.on('torrent-completed', (data) => {
        dispatch({ type: 'UPDATE_TORRENT', payload: { ...data, status: 'completed' } });
      });

      socket.on('torrent-error', (data) => {
        dispatch({ type: 'UPDATE_TORRENT', payload: { ...data, status: 'error' } });
      });

      socket.on('torrent-removed', (data) => {
        dispatch({ type: 'REMOVE_TORRENT', payload: data.id });
      });

      return () => {
        try {
          socket.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        clearInterval(refreshInterval);
      };
    } catch (error) {
      console.log('Socket.io not available, running in demo mode');
    }
  }, []);

  const loadTorrents = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.get('/torrents');
      console.log('Loaded torrents from API:', response.data);
      dispatch({ type: 'SET_TORRENTS', payload: response.data });
    } catch (error) {
      console.error('Error loading torrents:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addTorrent = async (magnetLink) => {
    try {
      const response = await api.post('/torrents', { magnetLink });
      
      // Immediately add to local state for better UX
      const newTorrent = {
        id: response.data.torrentId,
        name: `Loading... (${response.data.torrentId})`,
        status: 'pending',
        progress: 0,
        size: 0,
        download_speed: 0,
        upload_speed: 0,
        peers: 0,
        created_at: new Date().toISOString()
      };
      
      dispatch({ type: 'ADD_TORRENT', payload: newTorrent });
      
      // Refresh the torrent list to get updated data
      setTimeout(() => {
        loadTorrents();
      }, 500);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const removeTorrent = async (torrentId, deleteFiles = false) => {
    try {
      await api.delete(`/torrents/${torrentId}?deleteFiles=${deleteFiles}`);
      
      // Immediately remove from local state
      dispatch({ type: 'REMOVE_TORRENT', payload: torrentId });
      
    } catch (error) {
      throw error;
    }
  };

  const pauseTorrent = async (torrentId) => {
    try {
      await api.post(`/torrents/${torrentId}/pause`);
      
      // Update local state immediately
      dispatch({ 
        type: 'UPDATE_TORRENT', 
        payload: { id: torrentId, status: 'paused' }
      });
      
    } catch (error) {
      throw error;
    }
  };

  const resumeTorrent = async (torrentId) => {
    try {
      await api.post(`/torrents/${torrentId}/resume`);
      
      // Update local state - will be corrected by next refresh
      dispatch({ 
        type: 'UPDATE_TORRENT', 
        payload: { id: torrentId, status: 'downloading' }
      });
      
      // Refresh to get correct status
      setTimeout(() => loadTorrents(), 500);
      
    } catch (error) {
      throw error;
    }
  };

  const getTorrentDetails = async (torrentId) => {
    try {
      const response = await api.get(`/torrents/${torrentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    ...state,
    addTorrent,
    removeTorrent,
    pauseTorrent,
    resumeTorrent,
    getTorrentDetails,
    refreshTorrents: loadTorrents
  };

  return (
    <TorrentContext.Provider value={value}>
      {children}
    </TorrentContext.Provider>
  );
};

export const useTorrents = () => {
  const context = useContext(TorrentContext);
  if (!context) {
    throw new Error('useTorrents must be used within a TorrentProvider');
  }
  return context;
};