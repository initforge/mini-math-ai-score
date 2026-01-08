import MathRenderer from '../../common/MathRenderer';
import './AIExplanation.css';

export default function AIExplanation({ explanation }) {
  return (
    <div className="ai-explanation">
      <div className="explanation-header">
        <span className="ai-icon">🤖</span>
        <span className="explanation-title">Giải thích từ AI</span>
      </div>
      <div className="explanation-content">
        <MathRenderer content={explanation} />
      </div>
    </div>
  );
}

