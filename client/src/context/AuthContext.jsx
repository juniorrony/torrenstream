import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// Auth action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CONFIG: 'SET_CONFIG'
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  error: null,
  config: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        isLoading: false
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.SET_CONFIG:
      return {
        ...state,
        config: action.payload
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // API base URL
  const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';

  // Utility function for API calls
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    
    // Check if response has content and is JSON
    const contentType = response.headers.get('content-type');
    
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error(`Invalid JSON response from ${endpoint}`);
      }
    } else if (!response.ok) {
      // If it's an error response but not JSON, try to get text for better error message
      try {
        const text = await response.text();
        throw new Error(`HTTP error! status: ${response.status}${text ? ` - ${text}` : ''}`);
      } catch (textError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  };

  // Load authentication config
  const loadConfig = useCallback(async () => {
    try {
      const config = await apiCall('/auth/config');
      dispatch({ type: AUTH_ACTIONS.SET_CONFIG, payload: config });
    } catch (error) {
      console.error('Failed to load auth config:', error);
    }
  }, []);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      const response = await apiCall('/auth/check');
      
      if (response && response.authenticated && response.user) {
        dispatch({ 
          type: AUTH_ACTIONS.LOGIN_SUCCESS, 
          payload: { 
            user: response.user, 
            token: 'cookie-based' // Using HTTP-only cookies
          } 
        });
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: credentials
      });

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.user,
          token: 'cookie-based' // Using HTTP-only cookies
        }
      });

      return { success: true, user: response.user };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: userData
      });

      return { 
        success: true, 
        user: response.user, 
        message: response.message 
      };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  // Forgot password function
  const forgotPassword = useCallback(async (email) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });

      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (token, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiCall('/auth/reset-password', {
        method: 'POST',
        body: { token, password }
      });

      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Change password function
  const changePassword = useCallback(async (passwordData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiCall('/auth/change-password', {
        method: 'POST',
        body: passwordData
      });

      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Verify email function
  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await apiCall(`/auth/verify/${token}`);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Get user profile
  const getProfile = useCallback(async () => {
    try {
      const response = await apiCall('/auth/profile');
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: response.user });
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!state.user || !state.user.permissions) return false;
    return state.user.permissions.includes(permission);
  }, [state.user]);

  // Check if user has role
  const hasRole = useCallback((role) => {
    if (!state.user) return false;
    if (Array.isArray(role)) {
      return role.includes(state.user.role);
    }
    return state.user.role === role;
  }, [state.user]);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: response.user });
      return response;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, [apiCall]);

  // Upload user avatar
  const uploadAvatar = useCallback(async (file) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE}/auth/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Avatar upload failed');
      }

      const data = await response.json();
      
      // Update user with new avatar URL
      const updatedUser = {
        ...state.user,
        avatarUrl: data.avatarUrl
      };
      
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: updatedUser });
      return data;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, [state.user]);

  // Delete user avatar
  const deleteAvatar = useCallback(async () => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await apiCall('/auth/avatar', {
        method: 'DELETE'
      });

      // Update user to remove avatar URL
      const updatedUser = {
        ...state.user,
        avatarUrl: null
      };
      
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: updatedUser });
      return response;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, [apiCall, state.user]);

  // Load initial data
  useEffect(() => {
    loadConfig();
    checkAuth();
  }, [loadConfig, checkAuth]);

  // Enhanced token refresh and session management
  useEffect(() => {
    if (!state.isAuthenticated || !state.token) return;

    // Check token expiration and refresh if needed
    const checkTokenExpiration = () => {
      // Skip token parsing for cookie-based auth
      if (state.token === 'cookie-based') {
        // For cookie-based auth, rely on server-side session management
        // Refresh every 25 minutes (assuming 30 min session timeout)
        return 25 * 60 * 1000;
      }
      
      try {
        const tokenPayload = JSON.parse(atob(state.token.split('.')[1]));
        const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;
        
        // Refresh token 5 minutes before expiration
        return Math.max(0, timeUntilExpiry - 5 * 60 * 1000);
      } catch (error) {
        console.error('Error parsing token:', error);
        return 0; // Force immediate refresh if token is invalid
      }
    };

    const scheduleTokenRefresh = () => {
      const timeUntilRefresh = checkTokenExpiration();
      
      if (timeUntilRefresh <= 0) {
        // Token expired or expiring soon, refresh immediately
        refreshToken();
        return;
      }

      // Schedule refresh
      const refreshTimeout = setTimeout(async () => {
        await refreshToken();
        scheduleTokenRefresh(); // Schedule next refresh
      }, timeUntilRefresh);

      return refreshTimeout;
    };

    const refreshToken = async () => {
      try {
        const response = await apiCall('/auth/refresh', { method: 'POST' });
        
        if (state.token === 'cookie-based') {
          // For cookie-based auth, just verify the session is still valid
          if (response && response.user) {
            dispatch({ 
              type: AUTH_ACTIONS.SET_USER, 
              payload: response.user 
            });
            console.log('🔄 Session refreshed successfully');
          }
        } else if (response.token) {
          // For JWT token auth
          dispatch({ 
            type: AUTH_ACTIONS.LOGIN_SUCCESS, 
            payload: { 
              user: response.user, 
              token: response.token 
            } 
          });
          localStorage.setItem('authToken', response.token);
          console.log('🔄 JWT token refreshed successfully');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, logout user
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    };

    const refreshTimeout = scheduleTokenRefresh();
    
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [state.isAuthenticated, state.token, apiCall]);

  // Session activity monitoring
  useEffect(() => {
    if (!state.isAuthenticated) return;

    let lastActivity = Date.now();
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity

    const updateLastActivity = () => {
      lastActivity = Date.now();
    };

    const checkSessionActivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        console.log('Session expired due to inactivity');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    };

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Check session every 5 minutes
    const sessionCheckInterval = setInterval(checkSessionActivity, 5 * 60 * 1000);

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateLastActivity);
      });
      clearInterval(sessionCheckInterval);
    };
  }, [state.isAuthenticated]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail,
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    clearError,
    checkAuth,
    
    // Utilities
    hasPermission,
    hasRole,
    
    // Loading states for specific actions
    isLoginLoading: state.isLoading,
    
    // Helper getters
    isAdmin: state.user?.role === 'admin',
    isModerator: state.user?.role === 'moderator' || state.user?.role === 'admin',
    isEmailVerified: state.user?.emailVerified || false,
    
    // User info helpers
    displayName: state.user?.displayName || state.user?.username,
    avatarUrl: state.user?.avatarUrl,
    userRole: state.user?.role
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
export const withAuth = (WrappedComponent, requiredRole = null) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, user, isLoading } = useAuth();
    
    if (isLoading) {
      return <div>Loading...</div>; // Replace with proper loading component
    }
    
    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>; // Replace with login redirect
    }
    
    if (requiredRole && user?.role !== requiredRole) {
      return <div>You don't have permission to access this page.</div>;
    }
    
    return <WrappedComponent {...props} />;
  };
};

export default AuthContext;