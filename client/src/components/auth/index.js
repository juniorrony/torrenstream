// Export all authentication components
export { default as AuthModal } from './AuthModal';
export { default as Login } from './Login';
export { default as Register } from './Register';
export { default as ForgotPassword } from './ForgotPassword';
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as UserMenu } from './UserMenu';

// Re-export authentication context
export { AuthProvider, useAuth, withAuth } from '../../context/AuthContext';