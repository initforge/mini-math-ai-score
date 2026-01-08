import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from sessionStorage on mount (mỗi tab riêng biệt)
    // MỖI TAB HOÀN TOÀN RIÊNG BIỆT - KHÔNG tự động đăng nhập từ localStorage
    const currentUser = authService.getCurrentUser();
    
    // CHỈ lấy từ sessionStorage của tab hiện tại
    // KHÔNG tự động đăng nhập từ localStorage khi mở tab mới
    setUser(currentUser);
    setLoading(false);
  }, []);

  // Lắng nghe thay đổi storage (khi tab khác thay đổi localStorage)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lastActiveSession') {
        // Session cuối cùng thay đổi, reload user
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Lưu session cuối cùng khi đóng tab hoặc tắt trình duyệt
  // CHỈ lưu khi đóng tab, KHÔNG lưu định kỳ
  // Điều này đảm bảo: Tab mới trong cùng session trình duyệt sẽ KHÔNG tự động đăng nhập
  // Chỉ khi tắt máy rồi mở lại, mới tự động đăng nhập từ localStorage
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Lưu session hiện tại vào localStorage trước khi đóng tab
      // Tab nào đóng cuối cùng sẽ là session được lưu
      authService.saveLastSession();
    };

    // CHỈ lưu khi đóng tab, KHÔNG lưu định kỳ
    // Vì nếu lưu định kỳ, tab mới trong cùng session sẽ tự động đăng nhập
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]); // Chạy lại khi user thay đổi

  const login = async (username, password, requiredRole) => {
    try {
      const userData = await authService.login(username, password);
      
      // Nếu truyền requiredRole thì chỉ cho phép login đúng role
      if (requiredRole && userData.role !== requiredRole) {
        // Logout ngay để không lưu sai role trong session
        authService.logout();
        throw new Error('Thông tin đăng nhập không đúng');
      }

      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole: (role) => user?.role === role
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

