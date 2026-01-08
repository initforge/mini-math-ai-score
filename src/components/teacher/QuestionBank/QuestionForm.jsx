import { useState, useEffect } from 'react';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { databaseService } from '../../../services/database';
import './QuestionForm.css';

// Môn học mặc định là Toán
const difficulties = [
  { value: 'easy', label: 'Dễ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'hard', label: 'Khó' }
];
const types = [
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'true_false', label: 'Đúng/Sai' },
  { value: 'short_answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' }
];

export default function QuestionForm({ question, teacherId, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: 'Toán', // Mặc định là Toán
    difficulty: 'medium',
    type: 'multiple_choice',
    content: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question) {
      setFormData({
        subject: question.subject || '',
        difficulty: question.difficulty || 'medium',
        type: question.type || 'multiple_choice',
        content: question.content || '',
        options: question.options || ['', '', '', ''],
        correctAnswer: question.correctAnswer || '',
        explanation: question.explanation || ''
      });
    }
  }, [question]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.content.trim()) {
        setError('Vui lòng nhập nội dung câu hỏi');
        setLoading(false);
        return;
      }

      if (formData.type === 'multiple_choice' && formData.options.some(opt => !opt.trim())) {
        setError('Vui lòng nhập đầy đủ 4 đáp án');
        setLoading(false);
        return;
      }

      if (!formData.correctAnswer.trim()) {
        setError('Vui lòng nhập đáp án đúng');
        setLoading(false);
        return;
      }

      const questionData = {
        subject: formData.subject,
        type: formData.type,
        difficulty: formData.difficulty,
        content: formData.content,
        options: formData.type === 'multiple_choice' ? formData.options : null,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation || '',
        createdBy: teacherId,
        usageCount: question?.usageCount || 0
      };

      if (question) {
        await databaseService.update(`questions/${question.id}`, questionData);
      } else {
        await databaseService.create('questions', questionData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving question:', error);
      setError('Lỗi khi lưu câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <form onSubmit={handleSubmit} className="question-form">
      <div className="form-row">
        <div className="form-group" style={{ display: 'none' }}>
          <input type="hidden" value="Toán" />
        </div>

        <div className="form-group">
          <label>Độ khó *</label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            className="form-select"
            required
          >
            {difficulties.map(diff => (
              <option key={diff.value} value={diff.value}>{diff.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Loại câu hỏi *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
            required
          >
            {types.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Nội dung câu hỏi *</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="form-textarea"
          rows={3}
          required
        />
      </div>

      {formData.type === 'multiple_choice' && (
        <div className="form-group">
          <label>Đáp án *</label>
          {formData.options.map((option, index) => (
            <Input
              key={index}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
              required
            />
          ))}
        </div>
      )}

      {formData.type === 'true_false' && (
        <div className="form-group">
          <label>Đáp án đúng *</label>
          <div className="true-false-buttons">
            <button
              type="button"
              className={`true-false-btn ${formData.correctAnswer === 'Đúng' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, correctAnswer: 'Đúng' })}
            >
              Đúng
            </button>
            <button
              type="button"
              className={`true-false-btn ${formData.correctAnswer === 'Sai' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, correctAnswer: 'Sai' })}
            >
              Sai
            </button>
          </div>
        </div>
      )}

      {formData.type !== 'true_false' && (
        <div className="form-group">
          <label>Đáp án đúng *</label>
          {formData.type === 'essay' ? (
            <textarea
              value={formData.correctAnswer}
              onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
              className="form-textarea form-textarea-large"
              rows={8}
              placeholder="Nhập đáp án mẫu cho câu tự luận..."
              required
            />
          ) : (
            <Input
              value={formData.correctAnswer}
              onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
              placeholder={formData.type === 'multiple_choice' ? 'A, B, C hoặc D' : 'Đáp án'}
              required
            />
          )}
        </div>
      )}

      <div className="form-group">
        <label>Giải thích (tùy chọn)</label>
        <textarea
          value={formData.explanation}
          onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
          className="form-textarea"
          rows={2}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </div>
    </form>
  );
}

