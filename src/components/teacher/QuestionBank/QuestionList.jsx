import Button from '../../common/Button';
import Card from '../../common/Card';
import MathRenderer from '../../common/MathRenderer';
import './QuestionList.css';

const typeLabels = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng/Sai',
  short_answer: 'Trả lời ngắn',
  essay: 'Tự luận'
};

const difficultyLabels = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó'
};

export default function QuestionList({ questions, onEdit, onDelete }) {
  if (questions.length === 0) {
    return (
      <Card>
        <p className="no-questions">Không có câu hỏi nào</p>
      </Card>
    );
  }

  return (
    <div className="questions-list">
      {questions.map(question => (
        <Card key={question.id} className="question-card">
          <div className="question-header">
            <div className="question-meta">
              <span className="badge badge-info">{question.subject}</span>
              <span className="badge badge-warning">{difficultyLabels[question.difficulty]}</span>
              <span className="badge">{typeLabels[question.type]}</span>
            </div>
            <div className="question-actions">
              <Button
                variant="secondary"
                onClick={() => onEdit(question)}
                className="btn-small"
              >
                Sửa
              </Button>
              <Button
                variant="secondary"
                onClick={() => onDelete(question.id)}
                className="btn-small btn-danger"
              >
                Xóa
              </Button>
            </div>
          </div>
          <div className="question-content">
            <p><MathRenderer content={question.content} /></p>
            {question.type === 'multiple_choice' && question.options && (
              <div className="question-options">
                {question.options.map((option, index) => (
                  <div key={index} className="option-item">
                    {String.fromCharCode(65 + index)}. <MathRenderer content={option} />
                  </div>
                ))}
              </div>
            )}
            {/* Hiển thị subQuestions cho câu đúng sai */}
            {question.type === 'true_false' && question.subQuestions && question.subQuestions.length > 0 && (
              <div className="question-options subquestions">
                {question.subQuestions.map((subQ, index) => (
                  <div key={index} className="option-item subquestion-item">
                    <MathRenderer content={subQ} />
                  </div>
                ))}
              </div>
            )}
            <div className="question-answer">
              <strong>Đáp án đúng:</strong> <MathRenderer content={question.correctAnswer} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

