import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import MathRenderer from '../../common/MathRenderer';
import { databaseService } from '../../../services/database';
import './StudentExamDetail.css';

export default function StudentExamDetail() {
  const { examId, studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [result, setResult] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    loadData();
  }, [examId, studentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load exam template
      const examData = await databaseService.read(`examTemplates/${examId}`);
      setExam(examData);

      // Load student result
      const resultData = await databaseService.read(`examResults/${examId}/${studentId}`);
      setResult(resultData);

      // Load student info
      const studentData = await databaseService.read(`users/${studentId}`);
      setStudent(studentData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionResult = (questionId) => {
    // Find result by matching questionId
    return result.results?.find(r => {
      // Handle both formats: r.questionId or direct index matching
      if (r.questionId) {
        return r.questionId === questionId;
      }
      return false;
    });
  };

  const renderQuestionResult = (question, index) => {
    const questionResult = getQuestionResult(question.id) || result.results?.[index];
    if (!questionResult) return null;

    const isCorrect = questionResult.score === (question.points || 0);
    const score = questionResult?.score || 0;

    return (
      <Card key={question.id || index} className={`question-detail-card ${isCorrect ? 'correct' : 'incorrect'}`}>
        <div className="question-detail-header">
          <span className="question-number">
            Câu {index + 1} - {
              question.type === 'multiple-choice' || question.type === 'multiple_choice' ? 'Trắc nghiệm' :
              question.type === 'true-false' || question.type === 'true_false' ? 'Đúng/Sai' :
              question.type === 'short-answer' || question.type === 'short_answer' ? 'Trả lời ngắn' :
              'Tự luận'
            }
          </span>
          <span className={`question-status ${isCorrect ? 'correct' : 'incorrect'}`}>
            {score.toFixed(2)}/{question.points} điểm
          </span>
        </div>

        <div className="question-content">
          <div className="question-text">
            <MathRenderer content={question.question || question.content} />
          </div>
          {question.image && (
            <div className="question-image">
              <img src={question.image} alt="Câu hỏi" />
            </div>
          )}
        </div>

        {/* Multiple Choice */}
        {(question.type === 'multiple-choice' || question.type === 'multiple_choice') && (
          <div className="answer-comparison">
            <p><strong>Đáp án của học sinh:</strong> {questionResult?.selectedAnswer || questionResult?.studentAnswer || '-'}</p>
            <p><strong>Đáp án đúng:</strong> {question.correctAnswer}</p>
          </div>
        )}

        {/* True/False */}
        {(question.type === 'true-false' || question.type === 'true_false') && (
          <div className="tf-results">
            {question.subQuestions?.map((sub, subIdx) => {
              const subResult = questionResult?.subAnswers?.[subIdx];
              const isSubCorrect = subResult === sub.correctAnswer;
              return (
                <div key={subIdx} className={`tf-item ${isSubCorrect ? 'correct' : 'incorrect'}`}>
                  <span className="tf-letter">{String.fromCharCode(65 + subIdx)})</span>
                  <div className="tf-question">
                    <MathRenderer content={sub.question} />
                  </div>
                  <div className="tf-answers">
                    <span>Học sinh: <strong>{subResult ? 'Đúng' : 'Sai'}</strong></span>
                    <span>Đáp án: <strong>{sub.correctAnswer ? 'Đúng' : 'Sai'}</strong></span>
                    <span>{isSubCorrect ? '✓' : '✗'}</span>
                  </div>
                </div>
              );
            })}
            {questionResult?.subResults && (
              <p className="tf-summary">
                Đúng: {questionResult.correctCount || 0}/{question.subQuestions?.length || 0} | 
                Sai: {questionResult.wrongCount || 0}
                {questionResult.wrongCount > 0 && ` (-${(questionResult.wrongCount * 0.25).toFixed(2)} điểm)`}
              </p>
            )}
          </div>
        )}

        {/* Short Answer */}
        {(question.type === 'short-answer' || question.type === 'short_answer') && (
          <div className="answer-comparison">
            <p><strong>Câu trả lời của học sinh:</strong> <MathRenderer content={questionResult?.answer || questionResult?.studentAnswer || '-'} /></p>
            <p><strong>Đáp án đúng:</strong> <MathRenderer content={question.correctAnswer} /></p>
          </div>
        )}

        {/* Essay */}
        {question.type === 'essay' && (
          <div className="essay-detail">
            {questionResult?.images && questionResult.images.length > 0 && (
              <div className="essay-section">
                <h6>📸 Bài làm (ảnh):</h6>
                <div className="images-grid">
                  {questionResult.images.map((img, imgIdx) => (
                    <img key={imgIdx} src={img} alt={`Bài làm ${imgIdx + 1}`} className="essay-image" />
                  ))}
                </div>
              </div>
            )}

            {questionResult?.ocrText && (
              <div className="essay-section">
                <h6>📸 Nội dung đã đọc từ ảnh:</h6>
                <div className="ocr-text"><MathRenderer content={questionResult.ocrText} /></div>
              </div>
            )}

            {question.rubric && (
              <div className="essay-section rubric">
                <h6>📋 Đáp án chi tiết (Barem):</h6>
                <MathRenderer content={question.rubric} />
              </div>
            )}

            {questionResult?.feedback && (
              <div className="essay-section">
                <h6>💬 Nhận xét:</h6>
                <MathRenderer content={questionResult.feedback} />
              </div>
            )}

            {questionResult?.strengths && questionResult.strengths.length > 0 && (
              <div className="essay-section">
                <h6>✅ Điểm mạnh:</h6>
                <ul>
                  {questionResult.strengths.map((s, i) => (
                    <li key={i}><MathRenderer content={s} /></li>
                  ))}
                </ul>
              </div>
            )}

            {questionResult?.weaknesses && questionResult.weaknesses.length > 0 && (
              <div className="essay-section">
                <h6>⚠️ Điểm cần cải thiện:</h6>
                <ul>
                  {questionResult.weaknesses.map((w, i) => (
                    <li key={i}><MathRenderer content={w} /></li>
                  ))}
                </ul>
              </div>
            )}

            {questionResult?.aiSuggestion && (
              <div className="essay-section">
                <h6>💡 Gợi ý cải thiện:</h6>
                <MathRenderer content={questionResult.aiSuggestion} />
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  if (loading) return <Loading />;

  if (!exam || !result || !student) {
    return (
      <Layout>
        <div className="page-container">
          <Card>
            <p>Không tìm thấy dữ liệu</p>
            <Button onClick={() => navigate('/teacher/results')}>Quay lại</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="student-exam-detail">
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title={`Chi tiết bài làm: ${exam.title}`}
              subtitle={`Học sinh: ${student.profile?.fullName}`}
            />
          </div>
        </div>

        <div className="page-container">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/teacher/results')}
            style={{ marginBottom: 'var(--spacing-lg)' }}
          >
            ← Quay lại danh sách
          </Button>

          <Card className="student-info-card">
            <h3>Thông tin học sinh</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Họ tên:</span>
                <span className="info-value">{student.profile?.fullName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Lớp:</span>
                <span className="info-value">{student.profile?.class}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Điểm:</span>
                <span className="info-value score">
                  <strong>{result.score}</strong> / {result.maxScore}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Thời gian nộp:</span>
                <span className="info-value">
                  {result.submittedAt ? new Date(result.submittedAt).toLocaleString('vi-VN') : '-'}
                </span>
              </div>
            </div>
          </Card>

          {result.aiSuggestions && (
            <Card className="ai-suggestions-card">
              <h3>🤖 Nhận xét tổng quan từ AI</h3>
              
              {result.aiSuggestions.overallAssessment && (
                <div className="suggestion-section">
                  <h4>Đánh giá chung</h4>
                  <MathRenderer content={result.aiSuggestions.overallAssessment} />
                </div>
              )}

              {result.aiSuggestions.strengths && result.aiSuggestions.strengths.length > 0 && (
                <div className="suggestion-section strengths">
                  <h4>✅ Điểm mạnh</h4>
                  <ul>
                    {result.aiSuggestions.strengths.map((item, idx) => (
                      <li key={idx}><MathRenderer content={item} /></li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiSuggestions.weaknesses && result.aiSuggestions.weaknesses.length > 0 && (
                <div className="suggestion-section weaknesses">
                  <h4>⚠️ Điểm cần cải thiện</h4>
                  <ul>
                    {result.aiSuggestions.weaknesses.map((item, idx) => (
                      <li key={idx}><MathRenderer content={item} /></li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiSuggestions.focusAreas && result.aiSuggestions.focusAreas.length > 0 && (
                <div className="suggestion-section focus">
                  <h4>🎯 Các lĩnh vực cần tập trung</h4>
                  <ul>
                    {result.aiSuggestions.focusAreas.map((item, idx) => (
                      <li key={idx}><MathRenderer content={item} /></li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiSuggestions.studyPlan && result.aiSuggestions.studyPlan.length > 0 && (
                <div className="suggestion-section study-plan">
                  <h4>📚 Kế hoạch học tập</h4>
                  <ul>
                    {result.aiSuggestions.studyPlan.map((item, idx) => (
                      <li key={idx}><MathRenderer content={item} /></li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <div className="questions-section">
            <h3>Chi tiết từng câu hỏi</h3>
            {exam.questions?.map((question, index) => 
              renderQuestionResult(question, index)
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
