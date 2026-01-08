import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import './Hero.css';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-tag">
            <span>sử dụng API gemini</span>
          </div>
          <h1 className="hero-headline">
            <span>Hệ thống thi online</span>
            <span className="highlight">Thông minh</span>
          </h1>
          <p className="hero-description">
            Từ quản lý lớp học đến ra đề thi tự động, hệ thống cung cấp mọi công cụ cần thiết 
            để tạo, tổ chức và quản lý kỳ thi một cách hiệu quả với sự hỗ trợ của AI.
          </p>
          <div className="hero-actions">
            <Button onClick={() => navigate('/login/teacher')}>
              <span>✨</span> Dành cho giáo viên
            </Button>
            <Button variant="secondary" onClick={() => navigate('/login/student')}>
              <span>👤</span> Đăng nhập học sinh
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

