import ExamCard from './ExamCard';
import './ExamCardList.css';

export default function ExamCardList({ 
  exams, 
  activeTab, 
  onEdit, 
  onDelete, 
  onTogglePublic,
  currentUserId 
}) {
  if (exams.length === 0) {
    return (
      <div className="no-exams">
        <p>{activeTab === 'my' ? 'Bạn chưa có đề thi nào. Hãy tạo đề thi mới!' : 'Chưa có đề thi nào trong kho chung.'}</p>
      </div>
    );
  }

  return (
    <div className="exam-card-list">
      {exams.map(exam => (
        <ExamCard
          key={exam.id}
          exam={exam}
          activeTab={activeTab}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePublic={onTogglePublic}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

