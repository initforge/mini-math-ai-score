import { useState } from 'react';
import { useApiKey } from '../../contexts/ApiKeyContext';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import './ApiKeyModal.css';

export default function ApiKeyModal({ onClose }) {
  const { apiKey, updateApiKey } = useApiKey();
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    updateApiKey(inputKey.trim());
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 300);
  };

  return (
    <Modal isOpen={true} onClose={onClose} className="api-key-modal">
      <div className="api-key-modal-content">
        <h2 className="modal-title">🔑 Cấu hình API Key</h2>
        <p className="modal-description">
          Nhập Gemini API Key để sử dụng các tính năng AI trong hệ thống.
        </p>
        
        <div className="help-section">
          <a
            href="https://www.youtube.com/watch?v=JZCjL3hrvcY"
            target="_blank"
            rel="noopener noreferrer"
            className="help-link"
          >
            📺 Hướng dẫn cách lấy API Key
          </a>
        </div>

        <div className="input-section">
          <Input
            label="Gemini API Key"
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Nhập API Key của bạn..."
            autoComplete="off"
            showPasswordToggle={true}
          />
        </div>

        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || !inputKey.trim()}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

