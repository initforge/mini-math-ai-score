import { useState, useEffect } from 'react';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { databaseService } from '../../../services/database';
import './UserForm.css';

export default function UserForm({ user, role, onSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    class: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        password: user.password || '', // Hiển thị password thực
        fullName: user.profile?.fullName || '',
        phone: user.profile?.phone || user.profile?.email || '', // Support cả email cũ và phone mới
        class: user.profile?.class || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Parse name
      const nameParts = formData.fullName.trim().split(/\s+/);
      const firstName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

      const userData = {
        username: formData.username,
        password: formData.password || (user ? user.password : ''),
        role: role,
        profile: {
          fullName: formData.fullName,
          firstName,
          lastName,
          class: role === 'student' ? formData.class : '',
          phone: formData.phone || '',
          avatar: ''
        }
      };

      if (user) {
        // Update
        await databaseService.update(`users/${user.id}`, userData);
      } else {
        // Create
        await databaseService.create('users', userData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Lỗi khi lưu người dùng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <Input
        label="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
        disabled={!!user}
      />
      <Input
        label="Password"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required={!user}
        placeholder={user ? 'Để trống nếu không đổi mật khẩu' : ''}
        showPasswordToggle={true}
      />
      <Input
        label="Họ tên"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        required
      />
      {role === 'student' && (
        <Input
          label="Lớp"
          value={formData.class}
          onChange={(e) => setFormData({ ...formData, class: e.target.value })}
        />
      )}
      <Input
        label="Số điện thoại (tùy chọn)"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Nhập số điện thoại"
      />
      {error && <div className="error-message">{error}</div>}
      <div className="form-actions">
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </form>
  );
}

