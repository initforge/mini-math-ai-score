import { useState, useEffect } from 'react';
import Card from '../../common/Card';
import Button from '../../common/Button';
import MathRenderer from '../../common/MathRenderer';
import { databaseService } from '../../../services/database';
import { useApiKey } from '../../../contexts/ApiKeyContext';
import AIExplanation from './AIExplanation';
import './ExamDetail.css';

export default function ExamDetail({ exam, result }) {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const { apiKey } = useApiKey();

  useEffect(() => {
    loadQuestions();
  }, [exam]);

  const loadQuestions = async () => {
    // Questions already in exam object (from examTemplates)
    if (exam.questions && Array.isArray(exam.questions)) {
      // Check if questions are full objects or references
      if (exam.questions[0]?.content) {
        // Full question objects
        setQuestions(exam.questions);
      } else {
        // Question references, need to load
        const questionsList = [];
        for (const qRef of exam.questions) {
          const question = await databaseService.read(`questions/${qRef.questionId}`);
          if (question) {
            questionsList.push({ ...question, order: qRef.order });
          }
        }
        questionsList.sort((a, b) => a.order - b.order);
        setQuestions(questionsList);
      }
    }
  };

  const getQuestionResult = (questionId) => {
    return result.results?.find(r => r.questionId === questionId);
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { text: 'Xuất sắc', color: '#10b981' };
    if (percentage >= 80) return { text: 'Giỏi', color: '#3b82f6' };
    if (percentage >= 70) return { text: 'Khá', color: '#8b5cf6' };
    if (percentage >= 50) return { text: 'Trung bình', color: '#f59e0b' };
    return { text: 'Yếu', color: '#ef4444' };
  };

  const grade = getGrade(parseFloat(result.percentage || 0));

  const handleExplain = async (question) => {
    setSelectedQuestion(question);
    setLoadingExplanation(true);
    
    try {
      const detail = result.details?.[question.id];
      if (!detail || detail.correct) {
        setExplanation(null);
        setLoadingExplanation(false);
        return;
      }

      // Call Cloud Function explainAnswer
      const response = await fetch('/api/explainAnswer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.content,
          studentAnswer: detail.answer,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          apiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExplanation(data.explanation);
      }
    } catch (error) {
      console.error('Error getting explanation:', error);
      setExplanation('Không thể tải giải thích. Vui lòng thử lại.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className="exam-detail">
      <div className="detail-summary">
        <div className="summary-item">
          <span className="summary-label">Điểm số:</span>
          <span className="summary-value">{result.score?.toFixed(2)} / {result.maxScore}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Thời gian nộp:</span>
          <span className="summary-value">
            {result.gradedAt ? new Date(result.gradedAt).toLocaleString('vi-VN') : '-'}
          </span>
        </div>
      </div>

      {result.aiSuggestions && (
        <Card className="ai-suggestions-card">
          <h4>🤖 Nhận xét tổng quan từ AI</h4>
          
          {result.aiSuggestions.overallAssessment && (
            <div className="suggestion-section">
              <h5>Đánh giá chung:</h5>
              <MathRenderer content={result.aiSuggestions.overallAssessment} />
            </div>
          )}

          {result.aiSuggestions.strengths && result.aiSuggestions.strengths.length > 0 && (
            <div className="suggestion-section">
              <h5>✅ Điểm mạnh:</h5>
              <ul>
                {result.aiSuggestions.strengths.map((s, i) => (
                  <li key={i}><MathRenderer content={s} /></li>
                ))}
              </ul>
            </div>
          )}

          {result.aiSuggestions.weaknesses && result.aiSuggestions.weaknesses.length > 0 && (
            <div className="suggestion-section">
              <h5>⚠️ Điểm cần cải thiện:</h5>
              <ul>
                {result.aiSuggestions.weaknesses.map((w, i) => (
                  <li key={i}><MathRenderer content={w} /></li>
                ))}
              </ul>
            </div>
          )}

          {result.aiSuggestions.focusAreas && result.aiSuggestions.focusAreas.length > 0 && (
            <div className="suggestion-section">
              <h5>📚 Chủ đề cần ôn tập:</h5>
              <ul>
                {result.aiSuggestions.focusAreas.map((area, i) => (
                  <li key={i}><MathRenderer content={area} /></li>
                ))}
              </ul>
            </div>
          )}

          {result.aiSuggestions.studyPlan && result.aiSuggestions.studyPlan.length > 0 && (
            <div className="suggestion-section">
              <h5>📝 Kế hoạch học tập:</h5>
              <ol>
                {result.aiSuggestions.studyPlan.map((plan, i) => (
                  <li key={i}><MathRenderer content={plan} /></li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      )}

      <div className="questions-detail">
        <h4>Chi tiết từng câu:</h4>
        {questions.map((question, index) => {
          const questionResult = getQuestionResult(question.id);
          if (!questionResult) return null;

          const isCorrect = questionResult.score === questionResult.maxScore;
          
          return (
            <Card 
              key={question.id || index} 
              className={`question-detail-card ${isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div className="question-detail-header">
                <span className="question-number">
                  Câu {index + 1} - {
                    question.type === 'multiple_choice' ? 'Trắc nghiệm' :
                    question.type === 'true_false' ? 'Đúng/Sai' :
                    question.type === 'short_answer' ? 'Trả lời ngắn' :
                    'Tự luận'
                  }
                </span>
                <span className={`question-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                  {questionResult.score.toFixed(2)}/{questionResult.maxScore} điểm
                </span>
              </div>
              
              <p className="question-text"><MathRenderer content={question.content} /></p>
              
              {/* Multiple Choice */}
              {questionResult.type === 'multiple_choice' && (
                <div className="answer-comparison">
                  <p><strong>Đáp án của bạn:</strong> {questionResult.studentAnswer || '-'}</p>
                  <p><strong>Đáp án đúng:</strong> {questionResult.correctAnswer}</p>
                </div>
              )}

              {/* True/False */}
              {questionResult.type === 'true_false' && questionResult.subResults && (
                <div className="tf-results">
                  {questionResult.subResults.map((sub, idx) => (
                    <div key={idx} className={`tf-item ${sub.isCorrect ? 'correct' : 'incorrect'}`}>
                      <span className="tf-letter">{sub.letter})</span>
                      <span>Bạn: <strong>{sub.studentAnswer || '-'}</strong></span>
                      <span>Đúng: <strong>{sub.correctAnswer}</strong></span>
                      <span>{sub.isCorrect ? '✓' : '✗'}</span>
                    </div>
                  ))}
                  <p className="tf-summary">
                    Đúng: {questionResult.correctCount}/{questionResult.subResults.length} | 
                    Sai: {questionResult.wrongCount}
                    {questionResult.wrongCount > 0 && ` (-${(questionResult.wrongCount * 0.25).toFixed(2)} điểm)`}
                  </p>
                </div>
              )}

              {/* Short Answer */}
              {questionResult.type === 'short_answer' && (
                <div className="answer-comparison">
                  <p><strong>Câu trả lời của bạn:</strong> {questionResult.studentAnswer || '-'}</p>
                  <p><strong>Đáp án đúng:</strong> {questionResult.correctAnswer}</p>
                </div>
              )}

              {/* Essay */}
              {questionResult.type === 'essay' && (
                <div className="essay-detail">
                  {questionResult.ocrText && (
                    <div className="essay-section">
                      <h6>📸 Nội dung đã đọc từ ảnh:</h6>
                      <div className="ocr-text"><MathRenderer content={questionResult.ocrText} /></div>
                    </div>
                  )}
                  
                  {questionResult.feedback && (
                    <div className="essay-section">
                      <h6>💬 Nhận xét:</h6>
                      <MathRenderer content={questionResult.feedback} />
                    </div>
                  )}

                  {questionResult.strengths && questionResult.strengths.length > 0 && (
                    <div className="essay-section">
                      <h6>✅ Điểm mạnh:</h6>
                      <ul>
                        {questionResult.strengths.map((s, i) => (
                          <li key={i}><MathRenderer content={s} /></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {questionResult.weaknesses && questionResult.weaknesses.length > 0 && (
                    <div className="essay-section">
                      <h6>⚠️ Điểm cần cải thiện:</h6>
                      <ul>
                        {questionResult.weaknesses.map((w, i) => (
                          <li key={i}><MathRenderer content={w} /></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {questionResult.aiSuggestion && (
                    <div className="essay-section">
                      <h6>💡 Gợi ý cải thiện:</h6>
                      <MathRenderer content={questionResult.aiSuggestion} />
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

