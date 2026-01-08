import { useState, useEffect } from 'react';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { databaseService } from '../../../services/database';
import './ExamForm.css';

export default function ExamForm({ exam, teacherId, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    questions: [],
    isPublic: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title || '',
        duration: exam.duration || 60,
        questions: exam.questions || [],
        isPublic: exam.isPublic || false
      });
    }
  }, [exam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const examData = {
        ...formData,
        subject: 'Toán', // Mặc định là Toán, không hiển thị cho user
        createdBy: teacherId,
        createdAt: exam ? exam.createdAt : Date.now(),
        updatedAt: Date.now()
      };

      if (exam) {
        await databaseService.update(`examTemplates/${exam.id}`, examData);
      } else {
        await databaseService.create('examTemplates', examData);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Lỗi khi lưu đề thi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="exam-form">
      <div className="form-group">
        <label>Tên đề thi *</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Nhập tên đề thi"
          required
        />
      </div>

      <div className="form-group">
        <label>Thời gian làm bài (phút) *</label>
        <Input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
          min="1"
          required
        />
      </div>

      {formData.questions && formData.questions.length > 0 && (
        <div className="form-group">
          <label style={{ textAlign: 'center', display: 'block' }}>
            Số câu hỏi: {formData.questions.length}
          </label>
        </div>
      )}

      <div className="form-group">
        <label style={{ textAlign: 'center', display: 'block' }}>
          <input
            type="checkbox"
            checked={formData.isPublic}
            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
          />
          <span style={{ marginLeft: '8px' }}>Chia sẻ công khai (hiển thị trong kho đề thi chung)</span>
        </label>
      </div>

      <div className="form-actions">
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : exam ? 'Cập nhật' : 'Tạo đề thi'}
        </Button>
      </div>
    </form>
  );
}

