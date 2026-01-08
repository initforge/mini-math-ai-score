import Card from '../../common/Card';
import Button from '../../common/Button';
import './HistoryList.css';

export default function HistoryList({ history, onViewDetail }) {
  if (history.length === 0) {
    return (
      <Card>
        <p className="no-history">Chưa có bài thi nào</p>
      </Card>
    );
  }

  const getGrade = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'Xuất sắc';
    if (percentage >= 80) return 'Giỏi';
    if (percentage >= 70) return 'Khá';
    if (percentage >= 50) return 'Trung bình';
    return 'Yếu';
  };

  return (
    <div className="history-list">
      {history.map((item, index) => (
        <Card key={`${item.examId}-${index}`} className="history-card">
          <div className="history-header">
            <div>
              <h3>
                {item.exam.title}
                {item.totalAttempts > 1 && (
                  <span className="attempt-badge">
                    Lần {item.attemptNumber}/{item.totalAttempts}
                  </span>
                )}
              </h3>
              <p className="history-subject">{item.exam.subject}</p>
            </div>
            <div className="history-score">
              <span className="score-value">{item.result.score}</span>
              <span className="score-max">/ {item.result.maxScore}</span>
            </div>
          </div>
          <div className="history-info">
            <p>
              <strong>Xếp loại:</strong> {getGrade(item.result.score, item.result.maxScore)}
            </p>
            <p>
              <strong>Thời gian nộp:</strong> {
                item.result.submittedAt 
                  ? new Date(item.result.submittedAt).toLocaleString('vi-VN')
                  : '-'
              }
            </p>
          </div>
          <Button 
            onClick={() => onViewDetail(item)}
            className="view-detail-button"
          >
            Xem chi tiết & Giải thích AI
          </Button>
        </Card>
      ))}
    </div>
  );
}

