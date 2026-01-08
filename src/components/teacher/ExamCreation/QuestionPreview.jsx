import Card from '../../common/Card';
import MathRenderer from '../../common/MathRenderer';
import './QuestionPreview.css';

export default function QuestionPreview({ questions, selectedQuestions, onToggle }) {
  return (
    <div className="question-preview">
      {questions.map((question, index) => (
        <Card
          key={question.id || index}
          className={`preview-card ${selectedQuestions.includes(question.id || index) ? 'selected' : ''}`}
          onClick={() => onToggle(question.id || index)}
        >
          <div className="preview-header">
            <input
              type="checkbox"
              checked={selectedQuestions.includes(question.id || index)}
              onChange={() => onToggle(question.id || index)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="question-number">Câu {index + 1}</span>
          </div>
          <p className="question-content">
            <MathRenderer content={question.content} />
          </p>
          {question.options && (
            <div className="question-options">
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="option-item">
                  {String.fromCharCode(65 + optIndex)}. <MathRenderer content={option} />
                </div>
              ))}
            </div>
          )}
          <div className="correct-answer">
            Đáp án đúng: <strong><MathRenderer content={question.correctAnswer} /></strong>
          </div>
        </Card>
      ))}
    </div>
  );
}

