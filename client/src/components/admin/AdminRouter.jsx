import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import DashboardOverview from './DashboardOverview';
import UsersManagement from './UsersManagement';
import RBACManagement from './RBACManagement';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';

const AdminRouter = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { isAdmin } = useAuth();

  // Navigation handler
  const handleNavigation = (page) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
      case 'users-list':
        return <UsersManagement />;
      case 'users-add':
        return <UsersManagement initialView="add" />;
      case 'users-banned':
        return <UsersManagement initialFilter={{ status: 'banned' }} />;
      case 'torrents':
      case 'torrents-list':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Content Management</h2>
            <p>Torrent management interface coming soon...</p>
          </div>
        );
      case 'torrents-active':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Active Streams</h2>
            <p>Active streaming monitoring coming soon...</p>
          </div>
        );
      case 'system-analytics':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Analytics</h2>
            <p>Advanced analytics dashboard coming soon...</p>
          </div>
        );
      case 'system-logs':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Audit Logs</h2>
            <p>Detailed audit logs viewer coming soon...</p>
          </div>
        );
      case 'system-performance':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Performance Monitoring</h2>
            <p>System performance metrics coming soon...</p>
          </div>
        );
      case 'system-storage':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Storage Management</h2>
            <p>Storage monitoring and management coming soon...</p>
          </div>
        );
      case 'rbac':
        return <RBACManagement />;
      case 'security':
        return (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Security Dashboard</h2>
            <p>Security monitoring and settings coming soon...</p>
          </div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <ProtectedRoute requiredRole="admin" fallbackMessage="Admin access required to view this dashboard">
      <AdminDashboard currentPage={currentPage} onNavigate={handleNavigation}>
        {renderCurrentPage()}
      </AdminDashboard>
    </ProtectedRoute>
  );
};

export default AdminRouter;