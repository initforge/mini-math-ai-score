import Button from './Button';
import './ConfirmModal.css';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Xác nhận', 
  message, 
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger' // 'danger' | 'warning' | 'info'
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon confirm-modal-icon-${variant}`}>
            {variant === 'danger' && '⚠️'}
            {variant === 'warning' && '⚠️'}
            {variant === 'info' && 'ℹ️'}
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <Button 
            variant="secondary" 
            onClick={onClose}
            className="confirm-modal-cancel"
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'action'} 
            onClick={handleConfirm}
            className="confirm-modal-confirm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

