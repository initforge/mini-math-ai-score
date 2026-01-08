import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';

// Dùng sessionStorage cho mỗi tab riêng biệt
const USER_STORAGE_KEY = 'currentUser';
// Lưu session cuối cùng vào localStorage để track
const LAST_SESSION_KEY = 'lastActiveSession';
// Channel để đồng bộ giữa các tab
const AUTH_CHANNEL_NAME = 'auth-sync';

// Tạo BroadcastChannel để đồng bộ giữa các tab
let authChannel = null;
if (typeof BroadcastChannel !== 'undefined') {
  authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
}

export const authService = {
  // Lấy BroadcastChannel để các component khác có thể lắng nghe
  getChannel() {
    return authChannel;
  },

  // Login với username/password
  async login(username, password) {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val() || {};
      
      // Tìm user theo username
      const userEntry = Object.entries(users).find(
        ([_, user]) => user.username === username
      );
      
      if (!userEntry) {
        throw new Error('Tên đăng nhập không tồn tại');
      }
      
      const [userId, user] = userEntry;
      
      // So sánh password (plain text)
      if (user.password !== password) {
        throw new Error('Mật khẩu không đúng');
      }
      
      // Lưu user vào sessionStorage (mỗi tab riêng)
      const userData = {
        id: userId,
        ...user,
        lastLogin: Date.now(),
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      // CHỈ lưu vào sessionStorage của tab hiện tại
      // KHÔNG lưu vào localStorage ngay lúc đăng nhập
      // Chỉ lưu vào localStorage khi đóng tab (trong beforeunload)
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      
      // Thông báo cho các tab khác (nếu cần)
      if (authChannel) {
        authChannel.postMessage({
          type: 'LOGIN',
          user: userData
        });
      }
      
      return userData;
    } catch (error) {
      throw error;
    }
  },
  
  // Logout
  logout() {
    const currentUser = this.getCurrentUser();
    
    // Xóa sessionStorage của tab hiện tại
    sessionStorage.removeItem(USER_STORAGE_KEY);
    
    // Nếu đây là session cuối cùng, xóa luôn localStorage
    try {
      const lastSession = JSON.parse(localStorage.getItem(LAST_SESSION_KEY) || '{}');
      if (lastSession.sessionId === currentUser?.sessionId) {
        localStorage.removeItem(LAST_SESSION_KEY);
      }
    } catch (e) {
      // Ignore
    }
    
    // Thông báo cho các tab khác
    if (authChannel) {
      authChannel.postMessage({
        type: 'LOGOUT',
        sessionId: currentUser?.sessionId
      });
    }
  },

  // Lưu session cuối cùng khi đóng tab (gọi từ beforeunload)
  // Chỉ lưu khi đóng tab, không lưu khi đăng nhập
  saveLastSession() {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      // Lưu session hiện tại vào localStorage (session cuối cùng)
      // Chỉ lưu khi đóng tab, để khi tắt máy rồi mở lại mới tự động đăng nhập
      localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({
        ...currentUser,
        timestamp: Date.now()
      }));
    }
  },
  
  // Lấy user hiện tại từ sessionStorage (tab hiện tại)
  // MỖI TAB HOÀN TOÀN RIÊNG BIỆT - KHÔNG tự động đăng nhập từ localStorage
  getCurrentUser() {
    // CHỈ lấy từ sessionStorage của tab hiện tại
    // KHÔNG tự động đăng nhập từ localStorage khi mở tab mới
    const userStr = sessionStorage.getItem(USER_STORAGE_KEY);
    
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Hàm riêng để tự động đăng nhập từ localStorage (chỉ gọi khi thực sự cần)
  // Chỉ gọi khi: Tắt máy rồi mở lại (không có tab nào đang mở)
  autoLoginFromLastSession() {
    try {
      const lastSession = localStorage.getItem(LAST_SESSION_KEY);
      if (!lastSession) return null;

      const lastSessionData = JSON.parse(lastSession);
      // Kiểm tra xem session có còn hợp lệ không (trong vòng 7 ngày)
      const sessionAge = Date.now() - (lastSessionData.timestamp || 0);
      const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000; // 7 ngày
      
      if (sessionAge < MAX_SESSION_AGE) {
        // Copy vào sessionStorage của tab mới
        // Tạo sessionId mới cho tab mới này
        const { timestamp, ...userData } = lastSessionData;
        userData.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        return userData;
      } else {
        // Session quá cũ, xóa đi
        localStorage.removeItem(LAST_SESSION_KEY);
        return null;
      }
    } catch (e) {
      return null;
    }
  },
  
  // Check xem user đã đăng nhập chưa
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  },
  
  // Check role
  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  }
};

