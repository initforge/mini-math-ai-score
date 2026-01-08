import './Loading.css';

export default function Loading({ message = 'Đang tải...' }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

