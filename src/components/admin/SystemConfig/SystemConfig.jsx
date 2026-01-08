import { useState, useEffect } from 'react';
import Header from '../../common/Header';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import './SystemConfig.css';

export default function SystemConfig() {
  const [config, setConfig] = useState({
    logo: '',
    siteName: 'Hệ thống thi online',
    maintenanceMode: false,
    maintenanceMessage: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configData = await databaseService.read('systemConfig');
      if (configData) {
        setConfig(configData);
        if (configData.logo) {
          setLogoPreview(configData.logo);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = config.logo;
      
      // TODO: Upload logo to Firebase Storage if needed
      // For now, we'll use data URL or keep existing
      if (logoPreview && logoPreview.startsWith('data:')) {
        logoUrl = logoPreview; // In production, upload to storage and get URL
      }

      const newConfig = {
        ...config,
        logo: logoUrl,
        updatedAt: Date.now()
      };

      await databaseService.update('systemConfig', newConfig);
      alert('Đã lưu cấu hình thành công!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="system-config">
      <Header />
      <div className="container">
        <h1 className="page-title">Cấu hình Hệ thống</h1>
        
        <Card>
          <h2>Cài đặt chung</h2>
          
          <div className="config-section">
            <label className="config-label">Logo</label>
            <div className="logo-upload">
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" className="logo-preview" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="file-input"
              />
            </div>
          </div>

          <div className="config-section">
            <Input
              label="Tên web"
              value={config.siteName}
              onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
            />
          </div>

          <div className="config-section">
            <label className="config-label">Chế độ bảo trì</label>
            <div className="toggle-section">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {config.maintenanceMode ? 'Đang bảo trì' : 'Hoạt động bình thường'}
              </span>
            </div>
          </div>

          {config.maintenanceMode && (
            <div className="config-section">
              <label className="config-label">Thông báo bảo trì</label>
              <textarea
                className="maintenance-message"
                value={config.maintenanceMessage}
                onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                placeholder="Nhập thông báo bảo trì..."
                rows={4}
              />
            </div>
          )}

          <div className="config-actions">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </Card>

        <Card className="preview-card">
          <h2>Preview</h2>
          <div className="preview-content">
            {logoPreview && (
              <div className="preview-logo">
                <img src={logoPreview} alt="Logo" />
              </div>
            )}
            <h3>{config.siteName}</h3>
            {config.maintenanceMode && (
              <div className="maintenance-banner">
                {config.maintenanceMessage || 'Hệ thống đang bảo trì'}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
