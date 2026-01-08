import { useState } from 'react';
import Card from '../../common/Card';
import MathRenderer from '../../common/MathRenderer';
import './QuestionList.css';

export default function QuestionList({ questions, answers, onAnswerChange }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [essayImages, setEssayImages] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  const handleAnswer = (questionId, answer) => {
    onAnswerChange(questionId, answer);
  };

  const handleTrueFalseInput = (questionId, value) => {
    // Only accept Đ, D, S - convert to uppercase and normalize
    const normalized = value.toUpperCase().split('').map(char => {
      if (char === 'Đ' || char === 'D') return 'Đ';
      if (char === 'S') return 'S';
      return '';
    }).join('');
    
    handleAnswer(questionId, normalized);
  };

  const handleImageUpload = async (files, questionKey) => {
    const images = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      images.push(base64);
    }
    
    setEssayImages(prev => ({
      ...prev,
      [questionKey]: [...(prev[questionKey] || []), ...images]
    }));
    
    // Save images to answer as JSON string
    const currentAnswer = answers[questionKey] || '{}';
    let answerData;
    try {
      answerData = JSON.parse(currentAnswer);
    } catch {
      answerData = { text: currentAnswer, images: [] };
    }
    answerData.images = [...(answerData.images || []), ...images];
    handleAnswer(questionKey, JSON.stringify(answerData));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e, questionKey) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleImageUpload(files, questionKey);
    }
  };

  const question = questions[currentQuestion];
  if (!question) return null;

  // KHÔNG tự động parse sub-questions từ content nữa
  // Chỉ dùng sub-questions nếu đã có trong dữ liệu gốc từ database

  return (
    <div className="question-list-container">
      <div className="question-navigation">
        <div className="question-numbers">
          {questions.map((q, index) => (
            <button
              key={q.id || index}
              className={`question-number-btn ${currentQuestion === index ? 'active' : ''} ${answers[q.id || index] ? 'answered' : ''}`}
              onClick={() => setCurrentQuestion(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="question-header">
        <h3>Câu {currentQuestion + 1}/{questions.length}</h3>
        <span className="question-points">({question.points || 1} điểm)</span>
      </div>

      <Card className="question-card">
          <p className="question-content">
            <MathRenderer content={question.content} />
          </p>

          {/* Hiển thị hình ảnh nếu có */}
          {question.images && question.images.length > 0 && (
            <div className="question-images">
              {question.images.map((img, imgIdx) => {
                console.log('[QuestionList] Rendering image:', { imgIdx, img });
                
                let imageSrc = null;
                
                if (typeof img === 'string') {
                  imageSrc = img;
                } else if (img && typeof img === 'object') {
                  imageSrc = img.base64 || img.src || img.url;
                }
                
                if (!imageSrc) {
                  console.warn('[QuestionList] No valid image source found for:', img);
                  return null;
                }
                
                // Fix: nếu không có prefix data:image, thêm vào
                if (!imageSrc.startsWith('data:')) {
                  console.log('[QuestionList] Adding data:image prefix to base64');
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
                      console.error('[QuestionList] Image failed to load:', imageSrc.substring(0, 100));
                      e.target.style.display = 'none';
                    }}
                  />
                );
              })}
            </div>
          )}

          {question.type === 'multiple_choice' && question.options && (
            <div className="answer-options">
              {question.options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index);
                const isSelected = answers[question.id || currentQuestion] === optionLetter;
                return (
                  <label
                    key={index}
                    className={`option-label ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id || currentQuestion}`}
                      value={optionLetter}
                      checked={isSelected}
                      onChange={() => handleAnswer(question.id || currentQuestion, optionLetter)}
                    />
                    <span className="option-letter">{optionLetter}.</span>
                    <span className="option-text">
                      <MathRenderer content={option} />
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {question.type === 'true_false' && (
            <div className="true-false-container">
              {/* Hiển thị các câu a), b), c), d) */}
              {question.subQuestions && question.subQuestions.length > 0 && (
                <div className="true-false-questions">
                  {question.subQuestions.map((subQ, index) => {
                    const subLetter = String.fromCharCode(97 + index); // a, b, c, d
                    return (
                      <div key={index} className="sub-question-item">
                        <strong>{subLetter})</strong> <MathRenderer content={subQ} />
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Một dòng input dài để điền ĐSĐS... */}
              <div className="true-false-answer-input">
                <label className="answer-input-label">
                  Điền đáp án (Đ = đúng, S = sai):
                  <span className="answer-hint">Ví dụ: ĐSĐS hoặc ĐĐĐS</span>
                </label>
                <input
                  type="text"
                  className="true-false-text-input"
                  value={answers[question.id || currentQuestion] || ''}
                  onChange={(e) => handleTrueFalseInput(question.id || currentQuestion, e.target.value)}
                  placeholder="Nhập chuỗi Đ hoặc S..."
                  maxLength={question.subQuestions?.length || 6}
                  autoComplete="off"
                />
                <div className="answer-preview">
                  {(answers[question.id || currentQuestion] || '').split('').map((char, idx) => (
                    <span key={idx} className={`answer-char ${char === 'Đ' ? 'correct' : char === 'S' ? 'wrong' : ''}`}>
                      {char || '-'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {question.type === 'short_answer' && (
            <input
              type="text"
              className="short-answer-input"
              value={answers[question.id || currentQuestion] || ''}
              onChange={(e) => handleAnswer(question.id || currentQuestion, e.target.value)}
              placeholder="Nhập câu trả lời..."
            />
          )}

          {question.type === 'essay' && (
            <div className="essay-answer-section">
              <div 
                className={`essay-upload-area ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, question.id || currentQuestion)}
              >
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      await handleImageUpload(files, question.id || currentQuestion);
                    }}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-button">
                    📷 Tải lên ảnh bài làm
                  </div>
                </label>
                
                <div className="drag-drop-hint">
                  hoặc kéo thả ảnh vào đây
                </div>
                
                {essayImages[question.id || currentQuestion] && essayImages[question.id || currentQuestion].length > 0 && (
                  <div className="uploaded-images">
                    {essayImages[question.id || currentQuestion].map((img, idx) => (
                      <div key={idx} className="uploaded-image-preview">
                        <img src={img} alt={`Ảnh ${idx + 1}`} />
                        <button
                          className="remove-image"
                          onClick={() => {
                            const questionKey = question.id || currentQuestion;
                            const newImages = essayImages[questionKey].filter((_, i) => i !== idx);
                            setEssayImages(prev => ({ ...prev, [questionKey]: newImages }));
                            
                            const currentAnswer = answers[questionKey] || '{}';
                            let answerData;
                            try {
                              answerData = JSON.parse(currentAnswer);
                            } catch {
                              answerData = { text: '', images: [] };
                            }
                            answerData.images = newImages;
                            handleAnswer(questionKey, JSON.stringify(answerData));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <textarea
                className="essay-input"
                value={(() => {
                  const currentAnswer = answers[question.id || currentQuestion] || '';
                  try {
                    const parsed = JSON.parse(currentAnswer);
                    return parsed.text || '';
                  } catch {
                    return currentAnswer;
                  }
                })()}
                onChange={(e) => {
                  const questionKey = question.id || currentQuestion;
                  const currentAnswer = answers[questionKey] || '{}';
                  let answerData;
                  try {
                    answerData = JSON.parse(currentAnswer);
                  } catch {
                    answerData = { text: '', images: [] };
                  }
                  answerData.text = e.target.value;
                  handleAnswer(questionKey, JSON.stringify(answerData));
                }}
                placeholder="(Không bắt buộc) Ghi chú hoặc giải thích thêm..."
                rows={4}
              />
            </div>
          )}
        </Card>

        <div className="question-navigation-buttons">
          <button
            className="nav-button"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            ← Câu trước
          </button>
          <button
            className="nav-button"
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            disabled={currentQuestion === questions.length - 1}
          >
            Câu sau →
          </button>
        </div>
    </div>
  );
}

