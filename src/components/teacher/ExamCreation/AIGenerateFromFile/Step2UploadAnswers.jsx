import { useState } from 'react';
import Button from '../../../common/Button';
import Card from '../../../common/Card';
import Loading from '../../../common/Loading';
import MathRenderer from '../../../common/MathRenderer';
import { parseExcelAnswers, matchAnswersToQuestions } from '../../../../services/excelAnswerParser';
import './Step2UploadAnswers.css';

/**
 * Màn hình 2: Upload đáp án trắc nghiệm
 */
export default function Step2UploadAnswers({
  questions,
  onNext,
  onBack
}) {
  const [answerFile, setAnswerFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState(questions);
  const [replacedQuestions, setReplacedQuestions] = useState({}); // {questionIndex: imageUrl}

  const handleAnswerFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAnswerFile(file);
    }
  };

  const handleParseAnswers = async () => {
    if (!answerFile) {
      alert('Vui lòng chọn file đáp án');
      return;
    }

    setLoading(true);
    try {
      // Parse đáp án từ file Excel bằng code (không dùng AI)
      const answersByExamCode = await parseExcelAnswers(answerFile);

      // Lấy examCode từ questions (nếu có) hoặc dùng mã đề đầu tiên
      const examCodes = Object.keys(answersByExamCode);
      const examCode = questions[0]?.examCode || examCodes[0] || null;

      console.log(`[Step2] Parse Excel thành công, có ${examCodes.length} mã đề:`, examCodes);
      console.log(`[Step2] Sử dụng mã đề: ${examCode}`);

      // ⚠️ Match đáp án cho TẤT CẢ questions (Excel parser sẽ tự skip PHẦN IV)
      const updatedQuestions = matchAnswersToQuestions(questions, answersByExamCode, examCode);

      const answeredCount = updatedQuestions.filter(q => q.correctAnswer).length;
      setQuestionsWithAnswers(updatedQuestions);

      if (answeredCount > 0) {
        alert(`✅ Đã parse ${answeredCount}/${questions.length} đáp án từ ${examCodes.length} mã đề`);
      } else {
        alert('⚠️ Không parse được đáp án nào. Vui lòng kiểm tra format file (Excel với cột "Câu\\Mã Đề")');
      }
    } catch (error) {
      console.error('Error parsing answers:', error);
      alert('Lỗi khi parse đáp án: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thay thế câu hỏi bằng ảnh gốc
  const handleReplaceWithImage = (question, index) => {
    // Tìm ảnh gốc từ imageMapping (nếu có)
    const imageMapping = questions._imageMapping;
    if (!imageMapping || !imageMapping.examFiles || imageMapping.examFiles.length === 0) {
      alert('Không tìm thấy ảnh gốc. Vui lòng upload lại đề thi.');
      return;
    }

    // Cho user chọn ảnh từ danh sách ảnh đã upload
    const imageOptions = imageMapping.examFiles.map((img, idx) =>
      `${idx + 1}. ${img.name}`
    ).join('\n');

    const imageIndex = prompt(
      `Chọn ảnh để thay thế câu hỏi này:\n\n${imageOptions}\n\nNhập số thứ tự ảnh (1-${imageMapping.examFiles.length}):`
    );

    if (!imageIndex || isNaN(imageIndex) || imageIndex < 1 || imageIndex > imageMapping.examFiles.length) {
      return;
    }

    const selectedImage = imageMapping.examFiles[parseInt(imageIndex) - 1];
    const questionId = question.id || `${question.part}-${question.questionNumber || question.number || index}`;

    // Lưu vào state để hiển thị
    setReplacedQuestions(prev => ({
      ...prev,
      [questionId]: {
        preview: selectedImage.preview,
        source: selectedImage.name
      }
    }));

    alert(`✅ Đã thay thế câu hỏi bằng ảnh: ${selectedImage.name}`);
  };

  return (
    <div className="step2-upload-answers">
      <h2>Bước 2: Upload đáp án trắc nghiệm</h2>

      <Card className="upload-section">
        <h3>Upload file đáp án trắc nghiệm</h3>
        <p className="section-hint">
          Upload file Excel chứa đáp án trắc nghiệm (có format "Câu\Mã Đề | 101 | 103 | ...")
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleAnswerFileChange}
          className="file-input"
          id="answer-file-upload"
        />
        <label htmlFor="answer-file-upload" className="upload-label">
          <div className="upload-icon">📊</div>
          <p>Chọn file Excel đáp án trắc nghiệm</p>
        </label>

        {answerFile && (
          <div className="file-info">
            <p><strong>File đã chọn:</strong> {answerFile.name}</p>
          </div>
        )}
      </Card>

      {/* Preview câu hỏi và đáp án */}
      {questionsWithAnswers.length > 0 && (
        <Card className="answers-preview">
          <h3>Preview câu hỏi và đáp án ({questionsWithAnswers.filter(q => q.correctAnswer).length}/{questionsWithAnswers.length})</h3>
          <div className="questions-answers-list">
            {questionsWithAnswers.map((q, index) => {
              // Chỉ hiển thị PHẦN I, II, III (không hiển thị PHẦN IV ở đây)
              const part = q.part || 'I';
              const partName = q.partName || (q.part ? `PHẦN ${q.part}` : 'PHẦN I');
              const partKey = partName.toUpperCase().trim();
              if (partKey === 'PHẦN IV' || part === 'IV') {
                return null; // Bỏ qua PHẦN IV
              }

              const questionId = q.id || `${q.part}-${q.questionNumber || q.number || index}`;
              const replaced = replacedQuestions[questionId] || q.replacedWithImage;

              return (
                <div key={index} className="question-answer-item">
                  <div className="question-header">
                    <span className="question-ref">
                      {partName} - Câu {q.questionNumber || q.number || '?'}:
                    </span>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleReplaceWithImage(q, index)}
                      className="replace-image-btn"
                      title="Thay thế câu hỏi bằng ảnh gốc (nếu AI parse sai)"
                    >
                      📷 Thay bằng ảnh
                    </Button>
                  </div>

                  <div className="question-content">
                    <div className="question-text">
                      <strong>Câu hỏi:</strong>
                      {replaced ? (
                        <div className="replaced-image-preview">
                          <img
                            src={typeof replaced === 'string' ? replaced : replaced.preview}
                            alt={`Câu hỏi ${q.questionNumber || index + 1} (thay thế bằng ảnh)`}
                            className="question-image"
                          />
                          <p className="image-source">
                            Nguồn: {typeof replaced === 'string' ? q.imageSource : replaced.source}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="content-preview">
                            {q.content ? (
                              <MathRenderer content={q.content} />
                            ) : (
                              <span className="no-content">Chưa có nội dung câu hỏi</span>
                            )}
                          </div>
                          {/* Hiển thị ảnh đã mapping từ Step1 */}
                          {q.images && q.images.length > 0 && (
                            <div className="question-images-preview">
                              {q.images.map((img, imgIdx) => {
                                // Support nhiều format: base64, preview URL, hoặc URL
                                let imageSrc = '';
                                if (img.preview) {
                                  imageSrc = img.preview;
                                } else if (img.base64) {
                                  imageSrc = `data:${img.mimeType || 'image/png'};base64,${img.base64}`;
                                } else if (img.url) {
                                  imageSrc = img.url;
                                }

                                return imageSrc ? (
                                  <img
                                    key={imgIdx}
                                    src={imageSrc}
                                    alt={`Hình ${imgIdx + 1} - Câu ${q.questionNumber || q.number || index + 1}`}
                                    className="question-attached-image"
                                  />
                                ) : null;
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div className="options-preview">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="option-item">
                              <MathRenderer content={opt} />
                            </div>
                          ))}
                        </div>
                      )}
                      {q.subQuestions && q.subQuestions.length > 0 && (
                        <div className="subquestions-preview">
                          {q.subQuestions.map((sub, subIdx) => (
                            <div key={subIdx} className="subquestion-item">
                              <MathRenderer content={sub} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="answer-section">
                      <strong>Đáp án:</strong>
                      <span className={`answer-value ${q.correctAnswer ? 'has-answer' : 'no-answer'}`}>
                        {q.correctAnswer ? (
                          partKey === 'PHẦN II' ? (
                            <span>
                              <MathRenderer content={q.correctAnswer} />
                              <span className="answer-breakdown">
                                {' '}(a={q.correctAnswer[0] || ''}, b={q.correctAnswer[1] || ''}, c={q.correctAnswer[2] || ''}, d={q.correctAnswer[3] || ''})
                              </span>
                            </span>
                          ) : (
                            <MathRenderer content={q.correctAnswer} />
                          )
                        ) : (
                          'Chưa có đáp án'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="step-actions">
        <Button variant="secondary" onClick={onBack}>
          ← Quay lại
        </Button>
        <Button
          onClick={handleParseAnswers}
          disabled={!answerFile || loading}
          className="parse-btn"
        >
          {loading ? 'Đang parse...' : 'Parse đáp án'}
        </Button>
        <Button
          onClick={() => {
            // Merge replacedQuestions vào questions trước khi truyền
            const finalQuestions = questionsWithAnswers.map(q => {
              const questionId = q.id || `${q.part}-${q.questionNumber || q.number}`;
              const replaced = replacedQuestions[questionId];
              if (replaced) {
                return {
                  ...q,
                  replacedWithImage: replaced.preview,
                  imageSource: replaced.source
                };
              }
              return q;
            });
            onNext(finalQuestions);
          }}
          className="next-btn"
        >
          {questionsWithAnswers.some(q => q.correctAnswer)
            ? 'Tiếp theo: Upload đáp án tự luận →'
            : 'Bỏ qua bước này / Tiếp theo →'}
        </Button>
      </div>

      {loading && <Loading message="Đang parse đáp án từ Excel..." />}
    </div>
  );
}

