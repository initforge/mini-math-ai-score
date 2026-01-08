import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavItems = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard' },
        { path: '/admin/users', label: 'Quản lý Users' },
        { path: '/admin/config', label: 'Cấu hình' },
        { path: '/admin/logs', label: 'Logs' }
      ];
    } else if (user.role === 'teacher') {
      return [
        { path: '/teacher/dashboard', label: 'Dashboard' },
        { path: '/teacher/classes', label: 'Lớp học' },
        { path: '/teacher/exams', label: 'Kho đề thi' },
        { path: '/teacher/exams/create', label: 'Ra đề thi' },
        { path: '/teacher/exams/organize', label: 'Tổ chức thi' },
        { path: '/teacher/results', label: 'Kết quả' }
      ];
    } else if (user.role === 'student') {
      return [
        { path: '/student/home', label: 'Trang chủ' },
        { path: '/student/history', label: 'Lịch sử' },
        { path: '/student/statistics', label: 'Thống kê' }
      ];
    }
    return [];
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          {user && (
            <>
              <div className="header-logo" onClick={() => navigate('/')}>
                LOGO
              </div>
              <nav className="header-nav">
                {getNavItems().map((item) => (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.path);
                    }}
                    className="nav-link"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="header-actions">
                <Button variant="secondary" onClick={handleLogout} className="header-logout-button">
                  Đăng xuất
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

