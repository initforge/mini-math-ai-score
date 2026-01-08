import { useState } from 'react';
import Button from '../../../common/Button';
import Input from '../../../common/Input';
import Loading from '../../../common/Loading';
import QuestionPreview from '../QuestionPreview';
import ExamReview from '../ExamReview';
import './SuggestFromBankMode.css';

export default function SuggestFromBankMode({ apiKey }) {
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: '',
    count: 10
  });
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [step, setStep] = useState('form'); // form, preview, review

  const handleSuggest = async () => {
    if (!filters.subject || !filters.difficulty || !apiKey) {
      alert('Vui lòng điền đầy đủ thông tin và nhập API Key');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call Cloud Function suggestQuizFromBank
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data
      const mockQuestions = [
        {
          id: 'q1',
          content: 'Câu hỏi đề xuất 1?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A'
        }
      ];
      
      setSuggestedQuestions(mockQuestions);
      setSelectedQuestions(mockQuestions.map(q => q.id));
      setStep('preview');
    } catch (error) {
      console.error('Error suggesting questions:', error);
      alert('Lỗi khi đề xuất câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionToggle = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleCreateExam = () => {
    setStep('review');
  };

  if (step === 'form') {
    return (
      <div className="suggest-mode">
        <h3>Đề xuất từ Ngân hàng</h3>
        <div className="suggest-form">
          <div className="form-row">
            <div className="form-group">
              <label>Môn *</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Chọn môn</option>
                <option value="Toán">Toán</option>
                <option value="Lý">Lý</option>
                <option value="Hóa">Hóa</option>
              </select>
            </div>
            <div className="form-group">
              <label>Độ khó *</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Chọn độ khó</option>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
            <div className="form-group">
              <Input
                label="Số lượng câu hỏi *"
                type="number"
                value={filters.count}
                onChange={(e) => setFilters({ ...filters, count: parseInt(e.target.value) })}
                min="1"
                max="50"
                required
              />
            </div>
          </div>
          <Button onClick={handleSuggest} disabled={loading}>
            {loading ? 'Đang đề xuất...' : 'Đề xuất'}
          </Button>
          {loading && <Loading message="AI đang phân tích và đề xuất câu hỏi..." />}
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="preview-mode">
        <h3>Preview câu hỏi được đề xuất ({suggestedQuestions.length} câu)</h3>
        <QuestionPreview
          questions={suggestedQuestions}
          selectedQuestions={selectedQuestions}
          onToggle={handleQuestionToggle}
        />
        <div className="preview-actions">
          <Button variant="secondary" onClick={() => setStep('form')}>
            Quay lại
          </Button>
          <Button onClick={handleCreateExam}>
            Tạo đề thi ({selectedQuestions.length} câu)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ExamReview
      questions={suggestedQuestions.filter(q => selectedQuestions.includes(q.id))}
      onBack={() => setStep('preview')}
    />
  );
}

