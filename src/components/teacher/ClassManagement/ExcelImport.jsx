import { useState } from 'react';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Loading from '../../common/Loading';
import { parseStudentList } from '../../../services/fileParser';
import './ExcelImport.css';

export default function ExcelImport({ teacherId, apiKey, onSuccess }) {
  const [file, setFile] = useState(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Vui lòng chọn file Excel');
      return;
    }
    if (!className.trim()) {
      setError('Vui lòng nhập tên lớp');
      return;
    }
    if (!apiKey) {
      setError('Vui lòng cập nhật API Key trong sidebar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await parseStudentList(file, className, teacherId, apiKey);
      setPreview(result.students);
      alert(`Đã import thành công ${result.students.length} học sinh!`);
      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      setError(error.message || 'Lỗi khi import file Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-import">
      <div className="import-form">
        <Input
          label="Tên lớp"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="Ví dụ: 10A1"
          required
        />
        
        <div className="file-input-wrapper">
          <label className="file-label">Chọn file Excel</label>
          <div className="file-upload-area">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="file-input"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="file-upload-label">
              <span className="file-upload-icon">📄</span>
              <span className="file-upload-text">
                {file ? file.name : 'Chọn hoặc kéo thả file Excel vào đây'}
              </span>
              {!file && <span className="file-upload-hint">(.xlsx, .xls)</span>}
            </label>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!apiKey && (
          <div className="error-message" style={{ color: '#f59e0b', marginBottom: '1rem' }}>
            ⚠️ Vui lòng cập nhật API Key trong sidebar để sử dụng tính năng này
          </div>
        )}

        <div className="import-actions">
          <Button onClick={handleImport} disabled={loading || !file || !className || !apiKey}>
            {loading ? 'Đang import...' : 'Import'}
          </Button>
        </div>
      </div>

      {preview && preview.length > 0 && (
        <div className="import-preview">
          <h3>Preview ({preview.length} học sinh)</h3>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Username</th>
                  <th>Password</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((student, index) => (
                  <tr key={index}>
                    <td>{student.fullName}</td>
                    <td>{student.username}</td>
                    <td>{student.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && <p>... và {preview.length - 10} học sinh khác</p>}
          </div>
        </div>
      )}
    </div>
  );
}

