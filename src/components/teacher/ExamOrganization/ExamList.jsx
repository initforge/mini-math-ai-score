import Card from '../../common/Card';
import Button from '../../common/Button';
import './ExamList.css';

const statusLabels = {
  draft: 'Nháp',
  scheduled: 'Đã lên lịch',
  active: 'Đang diễn ra',
  completed: 'Đã hoàn thành'
};

const statusColors = {
  draft: 'badge',
  scheduled: 'badge-info',
  active: 'badge-success',
  completed: 'badge-warning'
};

export default function ExamList({ exams, onRefresh, onEdit, onDelete }) {
  if (exams.length === 0) {
    return (
      <Card>
        <p className="no-exams">Không có đề thi nào</p>
      </Card>
    );
  }

  return (
    <div className="exam-list">
      {exams.map(exam => (
        <Card key={exam.id} className="exam-card">
          <div className="exam-header">
            <div>
              <h3>{exam.title}</h3>
              <span className={`badge ${statusColors[exam.status] || 'badge'}`}>
                {statusLabels[exam.status] || exam.status}
              </span>
            </div>
            <div className="exam-meta">
              <p><strong>Số câu:</strong> {exam.questions?.length || 0}</p>
              <p><strong>Thời gian:</strong> {exam.duration} phút</p>
            </div>
          </div>
          {exam.startTime && (
            <div className="exam-schedule">
              <p>Bắt đầu: {new Date(exam.startTime).toLocaleString('vi-VN')}</p>
              {exam.noEndTime ? (
                <p>Kết thúc: Không có (đề không bao giờ khóa)</p>
              ) : exam.endTime ? (
                <p>Kết thúc: {new Date(exam.endTime).toLocaleString('vi-VN')}</p>
              ) : (
                <p>Kết thúc: Chưa xác định</p>
              )}
            </div>
          )}
          {exam.startTime && exam.status !== 'active' && (
            <div className="exam-actions">
              <Button 
                variant="secondary" 
                onClick={() => onEdit && onEdit(exam)}
                className="edit-btn"
              >
                ✏️ Sửa
              </Button>
              <Button 
                variant="danger" 
                onClick={() => onDelete && onDelete(exam)}
                className="delete-btn"
              >
                🗑️ Xóa
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

