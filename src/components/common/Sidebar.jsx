import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApiKey } from '../../contexts/ApiKeyContext';
import Button from './Button';
import ApiKeyModal from './ApiKeyModal';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { apiKey } = useApiKey();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavItems = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/admin/users', label: 'Quản lý Users', icon: '👥' },
        { path: '/admin/logs', label: 'Logs', icon: '📋' }
      ];
    } else if (user.role === 'teacher') {
      return [
        { path: '/teacher/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/teacher/classes', label: 'Lớp học', icon: '🏫' },
        { path: '/teacher/exams/create', label: 'Ra đề thi', icon: '✍️' },
        { path: '/teacher/exams', label: 'Kho đề thi', icon: '📚' },
        { path: '/teacher/exams/organize', label: 'Tổ chức thi', icon: '🎯' },
        { path: '/teacher/results', label: 'Kết quả', icon: '📈' }
      ];
    } else if (user.role === 'student') {
      return [
        { path: '/student/home', label: 'Trang chủ', icon: '🏠' },
        { path: '/student/history', label: 'Lịch sử', icon: '📜' }
      ];
    }
    return [];
  };

  const navItems = getNavItems();
  const isActive = (path) => location.pathname === path;

  const getRoleLabel = () => {
    if (user.role === 'admin') return 'Quản trị viên';
    if (user.role === 'teacher') return 'Giáo viên';
    if (user.role === 'student') return 'Học sinh';
    return '';
  };

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-logo" onClick={() => navigate('/')}>
              <div className="logo-icon">🎓</div>
              <div className="logo-text">Hệ thống thi online</div>
            </div>
          )}
          {isCollapsed && (
            <div className="sidebar-logo-collapsed" onClick={() => navigate('/')}>
              <div className="logo-icon">🎓</div>
            </div>
          )}
          
          {!isCollapsed && user && (
            <div className="sidebar-user-info">
              {user.role !== 'admin' && (
                <div className="user-name">{user.fullName || user.username}</div>
              )}
              <div className="user-role">{getRoleLabel()}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {(user.role === 'teacher' || user.role === 'student') && !isCollapsed && (
            <Button
              variant="secondary"
              onClick={() => setShowApiKeyModal(true)}
              className="api-key-button"
            >
              <span>🔑</span> {apiKey ? 'Cập nhật API Key' : 'Thêm API Key'}
            </Button>
          )}
          {(user.role === 'teacher' || user.role === 'student') && isCollapsed && (
            <button
              className="api-key-button-collapsed"
              onClick={() => setShowApiKeyModal(true)}
              title={apiKey ? 'Cập nhật API Key' : 'Thêm API Key'}
            >
              🔑
            </button>
          )}
          
          <button
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Logout button */}
        <div className="sidebar-logout">
          <Button variant="secondary" onClick={handleLogout} className="logout-button">
            {!isCollapsed && <span>Đăng xuất</span>}
            {isCollapsed && <span>🚪</span>}
          </Button>
        </div>
      </aside>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
    </>
  );
}

