import { useState, useEffect } from 'react';
import Button from '../../common/Button';
import Modal from '../../common/Modal';
import { databaseService } from '../../../services/database';
import ExamDetail from './ExamDetail';
import './ExamCard.css';

export default function ExamCard({ 
  exam, 
  activeTab, 
  onEdit, 
  onDelete, 
  onTogglePublic,
  currentUserId 
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [teacherName, setTeacherName] = useState('');

  // Load teacher name if public exam
  useEffect(() => {
    if (activeTab === 'public' && exam.createdBy) {
      databaseService.read(`users/${exam.createdBy}`).then(user => {
        if (user?.profile?.fullName) {
          setTeacherName(user.profile.fullName);
        }
      });
    }
  }, [exam.createdBy, activeTab]);

  const formatDuration = (minutes) => {
    if (!minutes) return 'Chưa xác định';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} giờ ${mins} phút`;
    }
    return `${mins} phút`;
  };

  return (
    <>
      <div className="exam-card">
        <div 
          className="exam-card-header"
          style={{ borderLeftColor: '#3B82F6' }}
        >
          <div className="exam-card-title">
            <h3>{exam.title || 'Đề thi'}</h3>
            {exam.isPublic && activeTab === 'my' && (
              <span className="public-badge">Công khai</span>
            )}
          </div>
        </div>
        
        <div className="exam-card-body">
          <div className="exam-info-row">
            <span className="exam-info-label">Thời gian làm bài:</span>
            <span className="exam-info-value">{formatDuration(exam.duration)}</span>
          </div>
          
          {activeTab === 'public' && teacherName && (
            <div className="exam-info-row">
              <span className="exam-info-label">Giáo viên:</span>
              <span className="exam-info-value">{teacherName}</span>
            </div>
          )}
          
          {exam.questions && (
            <div className="exam-info-row">
              <span className="exam-info-label">Số câu hỏi:</span>
              <span className="exam-info-value">{exam.questions.length} câu</span>
            </div>
          )}
        </div>
        
        <div className="exam-card-actions">
          <Button 
            variant="secondary" 
            onClick={() => setShowDetail(true)}
            className="view-btn"
          >
            Xem chi tiết
          </Button>
          
          {activeTab === 'my' && (
            <>
              {onEdit && (
                <Button 
                  variant="secondary" 
                  onClick={() => onEdit(exam)}
                  className="edit-btn"
                >
                  Sửa
                </Button>
              )}
              {onTogglePublic && (
                <Button 
                  variant="secondary" 
                  onClick={() => onTogglePublic(exam)}
                  className="toggle-public-btn"
                >
                  {exam.isPublic ? 'Ẩn khỏi kho chung' : 'Chia sẻ công khai'}
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="danger" 
                  onClick={() => onDelete(exam.id)}
                  className="delete-btn"
                >
                  Xóa
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={exam.title || 'Đề thi'}
      >
        <ExamDetail exam={exam} />
      </Modal>
    </>
  );
}

