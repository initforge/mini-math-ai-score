import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import Button from '../../../common/Button';
import Input from '../../../common/Input';
import Loading from '../../../common/Loading';
import QuestionPreview from '../QuestionPreview';
import ExamReview from '../ExamReview';
import { databaseService } from '../../../../services/database';
import { generateExamFromTemplates } from '../../../../services/aiExamGenerator';
import './SuggestFromExamBankMode.css';

export default function SuggestFromExamBankMode({ apiKey }) {
  const { user } = useAuth();
  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExamIds, setSelectedExamIds] = useState([]);
  const [filters, setFilters] = useState({
    duration: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [step, setStep] = useState('select'); // select, preview, review

  useEffect(() => {
    loadAvailableExams();
  }, [filters]);

  const loadAvailableExams = async () => {
    try {
      const examsData = await databaseService.read('examTemplates');
      if (examsData) {
        const examsList = Object.entries(examsData)
          .map(([id, exam]) => ({ id, ...exam }))
          .filter(exam => {
            // Lọc theo duration nếu có (khoảng ±10 phút)
            if (filters.duration) {
              const duration = parseInt(filters.duration);
              const examDuration = exam.duration || 60;
              if (Math.abs(examDuration - duration) > 10) {
                return false;
              }
            }
            return true;
          });
        setAvailableExams(examsList);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    }
  };

  const handleExamToggle = (examId) => {
    setSelectedExamIds(prev => 
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const handleGenerate = async () => {
    if (selectedExamIds.length === 0 || !apiKey) {
      alert('Vui lòng chọn ít nhất một đề thi và nhập API Key');
      return;
    }

    setLoading(true);
    try {
      // Lấy các đề thi đã chọn
      const selectedExams = availableExams.filter(exam => selectedExamIds.includes(exam.id));
      
      // Gọi AI để xào xáo và tạo đề mới
      const newQuestions = await generateExamFromTemplates(selectedExams, apiKey);
      
      if (!newQuestions || newQuestions.length === 0) {
        alert('Không tạo được câu hỏi nào. Vui lòng thử lại.');
        return;
      }
      
      setGeneratedQuestions(newQuestions);
      setSelectedQuestions(newQuestions.map((q, idx) => idx));
      setStep('preview');
    } catch (error) {
      console.error('Error generating exam:', error);
      alert('Lỗi khi tạo đề thi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionToggle = (questionIndex) => {
    setSelectedQuestions(prev => 
      prev.includes(questionIndex)
        ? prev.filter(idx => idx !== questionIndex)
        : [...prev, questionIndex]
    );
  };

  const handleCreateExam = async () => {
    if (selectedQuestions.length === 0) {
      alert('Vui lòng chọn ít nhất một câu hỏi');
      return;
    }

    setStep('review');
  };

  const handleSaveExam = async (examDataFromReview, questionsToSave) => {
    if (!user) return;

    try {
      const examData = {
        title: examDataFromReview.title || `Đề thi ${examDataFromReview.subject} (AI Generate) - ${new Date().toLocaleDateString('vi-VN')}`,
        subject: examDataFromReview.subject,
        duration: examDataFromReview.duration || 60,
        questions: questionsToSave || generatedQuestions.filter((q, idx) => selectedQuestions.includes(idx)),
        createdBy: user.id,
        isPublic: false,
        isAIGenerated: true,
        createdAt: Date.now()
      };
      
      await databaseService.create('examTemplates', examData);
      alert('Đã lưu đề thi vào kho đề thi của bạn!');
      
      // Reset
      setStep('select');
      setSelectedExamIds([]);
      setGeneratedQuestions([]);
      setSelectedQuestions([]);
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Lỗi khi lưu đề thi');
      throw error;
    }
  };

  if (step === 'select') {
    return (
      <div className="suggest-exam-mode">
        <h3>Đề xuất từ Kho đề thi</h3>
        
        <div className="suggest-filters">
          <div className="form-group">
            <label>Thời gian làm bài (phút)</label>
            <Input
              type="number"
              value={filters.duration}
              onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
              placeholder="VD: 60"
              min="1"
            />
          </div>
        </div>

        <div className="available-exams">
          <h4>Chọn đề thi để AI xào xáo ({selectedExamIds.length} đã chọn)</h4>
          {availableExams.length === 0 ? (
            <p className="no-exams">Không có đề thi nào phù hợp</p>
          ) : (
            <div className="exam-selection-list">
              {availableExams.map(exam => (
                <div 
                  key={exam.id} 
                  className={`exam-selection-item ${selectedExamIds.includes(exam.id) ? 'selected' : ''}`}
                  onClick={() => handleExamToggle(exam.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedExamIds.includes(exam.id)}
                    onChange={() => handleExamToggle(exam.id)}
                  />
                  <div className="exam-selection-info">
                    <h5>{exam.title || `Đề thi ${exam.subject}`}</h5>
                    <p>Môn: {exam.subject} | Thời gian: {exam.duration || 60} phút | {exam.questions?.length || 0} câu</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="generate-actions">
          <Button 
            onClick={handleGenerate} 
            disabled={selectedExamIds.length === 0 || !apiKey || loading}
          >
            {loading ? 'AI đang xào xáo...' : 'AI Generate đề mới'}
          </Button>
        </div>
        
        {loading && (
          <Loading message="AI đang xào xáo đề thi: đổi số, đổi dạng, đổi ngôn từ..." />
        )}
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="preview-mode">
        <h3>Preview đề thi được AI tạo ({generatedQuestions.length} câu)</h3>
        <QuestionPreview
          questions={generatedQuestions}
          selectedQuestions={selectedQuestions}
          onToggle={handleQuestionToggle}
        />
        <div className="preview-actions">
          <Button variant="secondary" onClick={() => setStep('select')}>
            Quay lại
          </Button>
          <Button onClick={handleCreateExam}>
            Tạo đề thi ({selectedQuestions.length} câu)
          </Button>
        </div>
      </div>
    );
  }

  const selectedQuestionsData = generatedQuestions.filter((q, idx) => selectedQuestions.includes(idx));
  const examSubject = selectedQuestionsData[0]?.subject || 'Toán';
  const examDuration = filters.duration ? parseInt(filters.duration) : 60;

  return (
    <ExamReview
      questions={selectedQuestionsData}
      onBack={() => setStep('preview')}
      onSave={handleSaveExam}
    />
  );
}

