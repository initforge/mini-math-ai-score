import { useState } from 'react';
import Card from '../../common/Card';
import Input from '../../common/Input';
import Button from '../../common/Button';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import './ChangePassword.css';

export default function ChangePassword() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        setError('Vui lòng điền đầy đủ thông tin');
        setLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
        setLoading(false);
        return;
      }

      if (formData.newPassword.length < 6) {
        setError('Mật khẩu mới phải có ít nhất 6 ký tự');
        setLoading(false);
        return;
      }

      if (formData.currentPassword === formData.newPassword) {
        setError('Mật khẩu mới phải khác mật khẩu hiện tại');
        setLoading(false);
        return;
      }

      // Kiểm tra mật khẩu hiện tại
      if (!user) {
        setError('Không tìm thấy thông tin người dùng');
        setLoading(false);
        return;
      }

      const userData = await databaseService.read(`users/${user.id}`);
      if (!userData) {
        setError('Không tìm thấy thông tin người dùng');
        setLoading(false);
        return;
      }

      if (userData.password !== formData.currentPassword) {
        setError('Mật khẩu hiện tại không đúng');
        setLoading(false);
        return;
      }

      // Cập nhật mật khẩu mới
      await databaseService.update(`users/${user.id}`, {
        ...userData,
        password: formData.newPassword
      });

      setSuccess('Đổi mật khẩu thành công!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Lỗi khi đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      // Reset form when collapsing
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setError('');
      setSuccess('');
    }
  };

  return (
    <Card className={`change-password-widget ${isExpanded ? 'expanded' : ''}`}>
      <div className="change-password-header" onClick={handleToggle}>
        <div className="change-password-header-content">
          <span className="change-password-icon">🔒</span>
          <span className="change-password-title">Thay đổi mật khẩu</span>
        </div>
        <span className="change-password-arrow">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="change-password-content">
          <form onSubmit={handleSubmit} className="change-password-form">
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="Nhập mật khẩu hiện tại"
              required
              showPasswordToggle={true}
            />

            <Input
              label="Mật khẩu mới"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              required
              showPasswordToggle={true}
            />

            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Nhập lại mật khẩu mới"
              required
              showPasswordToggle={true}
            />

            {error && <div className="change-password-error">{error}</div>}
            {success && <div className="change-password-success">{success}</div>}

            <div className="change-password-actions">
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}

