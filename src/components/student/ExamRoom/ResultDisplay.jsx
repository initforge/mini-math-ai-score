import { useNavigate } from 'react-router-dom';
import Card from '../../common/Card';
import Button from '../../common/Button';
import MathRenderer from '../../common/MathRenderer';
import './ResultDisplay.css';

export default function ResultDisplay({ result, exam, questions }) {
  const navigate = useNavigate();

  const getGrade = (percentage) => {
    if (percentage >= 90) return { text: 'Xuất sắc', color: '#10b981' };
    if (percentage >= 80) return { text: 'Giỏi', color: '#3b82f6' };
    if (percentage >= 70) return { text: 'Khá', color: '#8b5cf6' };
    if (percentage >= 50) return { text: 'Trung bình', color: '#f59e0b' };
    return { text: 'Yếu', color: '#ef4444' };
  };

  const grade = getGrade(parseFloat(result.percentage));

  const getQuestionResult = (questionId) => {
    return result.results?.find(r => r.questionId === questionId);
  };

  return (
    <div className="result-display">
      <div className="container">
        <Card className="result-card">
          <div className="result-header">
            <h2>Kết quả bài thi</h2>
            <h3>{exam.title}</h3>
          </div>

          <div className="score-display">
            <div className="score-circle">
              <span className="score-value">{result.score.toFixed(2)}</span>
              <span className="score-max">/ {result.maxScore}</span>
            </div>
            <div className="grade-badge-large" style={{ backgroundColor: grade.color }}>
              {grade.text}
            </div>
            <div className="percentage">{result.percentage}%</div>
          </div>

          {result.tabSwitchCount > 0 && (
            <div className="tab-switch-info">
              <h5>⚠️ Cảnh báo:</h5>
              <p>Bạn đã rời khỏi tab làm bài <strong>{result.tabSwitchCount}</strong> lần trong quá trình thi.</p>
              <small>Thông tin này sẽ được ghi nhận và giáo viên có thể xem.</small>
            </div>
          )}

          {result.aiSuggestions && (
            <div className="ai-suggestions">
              <h4>🤖 Gợi ý từ AI</h4>
              
              {result.aiSuggestions.overallAssessment && (
                <div className="suggestion-section">
                  <h5>Đánh giá tổng quan:</h5>
                  <p>{result.aiSuggestions.overallAssessment}</p>
                </div>
              )}

              {result.aiSuggestions.strengths && result.aiSuggestions.strengths.length > 0 && (
                <div className="suggestion-section strengths">
                  <h5>✅ Điểm mạnh:</h5>
                  <ul>
                    {result.aiSuggestions.strengths.map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiSuggestions.weaknesses && result.aiSuggestions.weaknesses.length > 0 && (
                <div className="suggestion-section weaknesses">
                  <h5>⚠️ Điểm cần cải thiện:</h5>
                  <ul>
                    {result.aiSuggestions.weaknesses.map((weakness, idx) => (
                      <li key={idx}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiSuggestions.studyPlan && result.aiSuggestions.studyPlan.length > 0 && (
                <div className="suggestion-section study-plan">
                  <h5>📚 Kế hoạch học tập:</h5>
                  <ul>
                    {result.aiSuggestions.studyPlan.map((plan, idx) => (
                      <li key={idx}>{plan}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiSuggestions.focusAreas && result.aiSuggestions.focusAreas.length > 0 && (
                <div className="suggestion-section focus-areas">
                  <h5>🎯 Chủ đề cần ôn tập:</h5>
                  <ul>
                    {result.aiSuggestions.focusAreas.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="result-details">
            <h4>Chi tiết từng câu:</h4>
            <div className="details-list">
              {questions.map((question, index) => {
                const questionResult = getQuestionResult(question.id);
                if (!questionResult) return null;

                return (
                  <div 
                    key={question.id || index} 
                    className={`detail-item ${questionResult.score === questionResult.maxScore ? 'correct' : 'incorrect'}`}
                  >
                    <div className="detail-header">
                      <span>Câu {index + 1} - {question.type === 'multiple_choice' ? 'Trắc nghiệm' : question.type === 'true_false' ? 'Đúng/Sai' : question.type === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}</span>
                      <span className="detail-score">
                        {questionResult.score.toFixed(2)}/{questionResult.maxScore}
                      </span>
                    </div>
                    
                    <div className="detail-content">
                      <p className="question-text"><MathRenderer content={question.content} /></p>
                      
                      {questionResult.type === 'true_false' && questionResult.subResults && (
                        <div className="sub-results">
                          {questionResult.subResults.map((sub, idx) => (
                            <div key={idx} className={`sub-result ${sub.isCorrect ? 'correct' : 'incorrect'}`}>
                              <span className="sub-letter">{sub.letter})</span>
                              <span>Bạn chọn: <strong>{sub.studentAnswer || '-'}</strong></span>
                              <span>Đáp án: <strong>{sub.correctAnswer}</strong></span>
                              <span className="sub-status">{sub.isCorrect ? '✓' : '✗'}</span>
                            </div>
                          ))}
                          <p className="sub-summary">
                            Đúng: {questionResult.correctCount}/{questionResult.subResults.length} | 
                            Sai: {questionResult.wrongCount}
                            {questionResult.wrongCount > 0 && ` (-${(questionResult.wrongCount * 0.25).toFixed(2)} điểm)`}
                          </p>
                        </div>
                      )}

                      {questionResult.type === 'multiple_choice' && (
                        <div className="mc-result">
                          <p>Câu trả lời của bạn: <strong>{questionResult.studentAnswer || '-'}</strong></p>
                          <p>Đáp án đúng: <strong>{questionResult.correctAnswer}</strong></p>
                        </div>
                      )}

                      {questionResult.type === 'essay' && (
                        <div className="essay-result">
                          {questionResult.ocrText && (
                            <div className="ocr-section">
                              <h6>Nội dung đã đọc từ ảnh:</h6>
                              <div className="ocr-text"><MathRenderer content={questionResult.ocrText} /></div>
                            </div>
                          )}
                          {questionResult.feedback && (
                            <div className="feedback-section">
                              <h6>Nhận xét:</h6>
                              <MathRenderer content={questionResult.feedback} />
                            </div>
                          )}
                          {questionResult.strengths && questionResult.strengths.length > 0 && (
                            <div className="essay-strengths">
                              <strong>Điểm mạnh:</strong>
                              <ul>
                                {questionResult.strengths.map((s, i) => (
                                  <li key={i}><MathRenderer content={s} /></li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {questionResult.weaknesses && questionResult.weaknesses.length > 0 && (
                            <div className="essay-weaknesses">
                              <strong>Điểm yếu:</strong>
                              <ul>
                                {questionResult.weaknesses.map((w, i) => (
                                  <li key={i}><MathRenderer content={w} /></li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {questionResult.aiSuggestion && (
                            <div className="essay-suggestion">
                              <strong>Gợi ý cải thiện:</strong>
                              <MathRenderer content={questionResult.aiSuggestion} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="result-actions">
            <Button variant="secondary" onClick={() => navigate('/student/history')}>
              Xem lịch sử
            </Button>
            <Button onClick={() => navigate('/student/home')}>
              Về trang chủ
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

