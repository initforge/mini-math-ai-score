import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import './Login.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    // Delay to avoid conflict with PageTransition
    const timer = setTimeout(() => {
      if (containerRef.current && cardRef.current) {
        // Set initial state
        gsap.set(containerRef.current, { opacity: 1 });
        gsap.set(cardRef.current, { opacity: 1, y: 0, scale: 1 });
        
        // Animate
        gsap.from(cardRef.current, {
          y: 30,
          opacity: 0,
          scale: 0.95,
          duration: 0.5,
          ease: 'power2.out',
          delay: 0.1
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, 'admin');
      gsap.to(cardRef.current, {
        scale: 1.05,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          navigate('/admin/dashboard');
        }
      });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
      setLoading(false);
      gsap.to(cardRef.current, {
        x: [-10, 10, -10, 10, 0],
        duration: 0.5,
        ease: 'power2.out'
      });
    }
  };

  return (
    <div className="login-container admin-login" ref={containerRef}>
      <div className="login-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
      <Card className="login-card" ref={cardRef}>
        <div className="login-header">
          <div className="login-icon">⚙️</div>
          <h2>Đăng nhập Admin</h2>
          <p className="login-subtitle">Quản trị hệ thống</p>
        </div>
        <form onSubmit={handleSubmit}>
          <Input
            label="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập username"
            autoComplete="username"
            required
            autoFocus
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            required
          />
          {error && (
            <div className="error-message animate-error">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} className="login-button">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
