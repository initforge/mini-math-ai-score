import './Modal.css';

export default function Modal({ isOpen, onClose, children, title }) {
  // KHÔNG lock scroll của body - cho phép scroll màn hình chính khi modal mở
  // Chỉ modal content có thể scroll nếu nội dung dài

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

