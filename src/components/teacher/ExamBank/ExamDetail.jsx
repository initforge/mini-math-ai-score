import MathRenderer from '../../common/MathRenderer';
import './ExamDetail.css';

export default function ExamDetail({ exam }) {
  const formatDuration = (minutes) => {
    if (!minutes) return 'Chưa xác định';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} giờ ${mins} phút`;
    }
    return `${mins} phút`;
  };

  return (
    <div className="exam-detail">
      <div className="exam-detail-info">
        <div className="detail-row">
          <span className="detail-label">Thời gian làm bài:</span>
          <span className="detail-value">{formatDuration(exam.duration)}</span>
        </div>
        {exam.questions && (
          <div className="detail-row">
            <span className="detail-label">Số câu hỏi:</span>
            <span className="detail-value">{exam.questions.length} câu</span>
          </div>
        )}
      </div>

      {exam.questions && exam.questions.length > 0 && (
        <div className="exam-questions">
          <h4>Danh sách câu hỏi:</h4>
          <div className="questions-list">
            {exam.questions.map((question, index) => {
              console.log(`[ExamDetail] Câu ${index + 1}:`, {
                type: question.type,
                hasCorrectAnswer: !!question.correctAnswer,
                correctAnswer: question.correctAnswer,
                questionKeys: Object.keys(question)
              });
              
              // Log chi tiết cho câu tự luận
              if (question.type === 'essay') {
                console.log(`[ExamDetail] Essay Question ${index + 1} DETAILS:`, {
                  hasBarem: !!question.barem,
                  baremType: typeof question.barem,
                  baremLength: Array.isArray(question.barem) ? question.barem.length : 'not array',
                  hasBaremTotalPoints: !!question.baremTotalPoints,
                  hasBaremNotes: !!question.baremNotes,
                  hasBaremHasImage: !!question.baremHasImage,
                  allFields: question
                });
              }
              
              return (
              <div key={index} className="question-item">
                <div className="question-number">Câu {index + 1}</div>
                <div className="question-content">
                  <p><strong><MathRenderer content={question.content} /></strong></p>
                  
                  {/* Hiển thị hình ảnh nếu có */}
                  {question.images && question.images.length > 0 && (
                    <div className="question-images">
                      {question.images.map((img, imgIdx) => {
                        console.log('[ExamDetail] Rendering image:', { imgIdx, img });
                        
                        let imageSrc = null;
                        
                        if (typeof img === 'string') {
                          imageSrc = img;
                        } else if (img && typeof img === 'object') {
                          imageSrc = img.base64 || img.src || img.url;
                        }
                        
                        if (!imageSrc) {
                          console.warn('[ExamDetail] No valid image source found for:', img);
                          return null;
                        }
                        
                        // Fix: nếu không có prefix data:image, thêm vào
                        if (!imageSrc.startsWith('data:')) {
                          console.log('[ExamDetail] Adding data:image prefix to base64');
                          // Detect image type from base64 header
                          let mimeType = 'image/png';
                          if (imageSrc.startsWith('/9j/')) {
                            mimeType = 'image/jpeg';
                          } else if (imageSrc.startsWith('R0lGOD')) {
                            mimeType = 'image/gif';
                          }
                          imageSrc = `data:${mimeType};base64,${imageSrc}`;
                        }
                        
                        const imageAlt = (img && typeof img === 'object' && img.fileName) ? img.fileName : `Hình ${imgIdx + 1}`;
                        
                        return (
                          <img 
                            key={imgIdx} 
                            src={imageSrc} 
                            alt={imageAlt} 
                            className="question-image"
                            onError={(e) => {
                              console.error('[ExamDetail] Image failed to load:', imageSrc.substring(0, 100));
                              e.target.style.display = 'none';
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  
                  {question.type === 'multiple_choice' && question.options && (
                    <ul>
                      {question.options.map((opt, optIdx) => (
                        <li key={optIdx}><MathRenderer content={opt} /></li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Hiển thị subQuestions cho câu đúng sai */}
                  {question.type === 'true_false' && question.subQuestions && question.subQuestions.length > 0 && (
                    <ul className="subquestions-list">
                      {question.subQuestions.map((subQ, subIdx) => (
                        <li key={subIdx} className="subquestion-item">
                          <MathRenderer content={subQ} />
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Hiển thị đáp án */}
                  {(question.correctAnswer || (question.type === 'essay' && question.barem)) && (
                    <div className="correct-answer">
                      <strong>Đáp án đúng:</strong>
                      {question.type === 'essay' ? (
                        <div className="essay-answer">
                          {/* Nếu có barem với steps (format mới từ AI parse) */}
                          {question.barem && Array.isArray(question.barem) && question.barem.length > 0 ? (
                            <div className="barem-preview">
                              <div className="barem-steps">
                                {question.barem.map((step, stepIdx) => (
                                  <div key={stepIdx} className="barem-step">
                                    {step.label && (
                                      <span className="barem-step-label">{step.label}</span>
                                    )}
                                    <span className="barem-points">{step.points} điểm</span>
                                    {step.solution && (
                                      <div className="barem-solution">
                                        <MathRenderer content={step.solution} />
                                      </div>
                                    )}
                                    {step.description && !step.solution && (
                                      <div className="barem-description">
                                        <MathRenderer content={step.description} />
                                      </div>
                                    )}
                                    {step.requirements && step.requirements.length > 0 && (
                                      <ul className="barem-requirements">
                                        {step.requirements.map((req, reqIdx) => (
                                          <li key={reqIdx}><MathRenderer content={req} /></li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {question.baremTotalPoints && (
                                <div className="barem-total">Tổng điểm: {question.baremTotalPoints} điểm</div>
                              )}
                              {question.baremHasImage && (
                                <div className="barem-image-note">⚠️ Đáp án có hình vẽ/biểu đồ</div>
                              )}
                              {question.baremNotes && (
                                <div className="barem-notes">
                                  <MathRenderer content={question.baremNotes} />
                                </div>
                              )}
                            </div>
                          ) : question.correctAnswer ? (
                            /* Fallback: hiển thị correctAnswer dạng text */
                            <MathRenderer content={question.correctAnswer} />
                          ) : (
                            <div className="no-barem-warning">
                              ⚠️ Đề thi cũ chưa có barem chi tiết. Vui lòng tạo lại đề thi với Step 3 (Upload đáp án tự luận) để có barem đầy đủ.
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="short-answer">
                          {' '}<MathRenderer content={question.correctAnswer} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

