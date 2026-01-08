import { useState } from 'react';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { databaseService } from '../../../services/database';
import { logService } from '../../../services/logService';
import { useAuth } from '../../../contexts/AuthContext';
import './ExamReview.css';

export default function ExamReview({ questions, onBack, onSave }) {
  const { user } = useAuth();
  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    duration: 60
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!examData.title || !examData.subject) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setSaving(true);
    try {
      const examId = await databaseService.create('exams', {
        title: examData.title,
        subject: examData.subject,
        teacherId: user.id,
        questions: questions.map((q, index) => ({
          questionId: q.id || `q${index}`,
          points: 1,
          order: index + 1
        })),
        duration: examData.duration,
        status: 'draft',
        classIds: []
      });

      // Ghi log giáo viên ra đề thi
      if (user) {
        await logService.logTeacherCreateExam(user.username, examId, examData.title);
      }

      alert('Đã tạo đề thi thành công!');
      // Navigate to organize page
      window.location.href = '/teacher/exams/organize';
    } catch (error) {
      console.error('Error creating exam:', error);
      alert('Lỗi khi tạo đề thi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="exam-review">
      <h3>Tạo đề thi</h3>
      <div className="review-form">
        <Input
          label="Tên đề thi *"
          value={examData.title}
          onChange={(e) => setExamData({ ...examData, title: e.target.value })}
          required
        />
        <Input
          label="Môn *"
          value={examData.subject}
          onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
          required
        />
        <Input
          label="Thời gian làm bài (phút) *"
          type="number"
          value={examData.duration}
          onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) })}
          min="1"
          required
        />
        <div className="questions-summary">
          <p><strong>Số câu hỏi:</strong> {questions.length}</p>
        </div>
        <div className="review-actions">
          <Button variant="secondary" onClick={onBack}>
            Quay lại
          </Button>
          {onSave ? (
            <Button onClick={() => {
              if (!examData.title || !examData.subject) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
              }
              setSaving(true);
              onSave(examData, questions).finally(() => setSaving(false));
            }} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu vào Kho đề thi'}
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Đang tạo...' : 'Tạo đề thi'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

