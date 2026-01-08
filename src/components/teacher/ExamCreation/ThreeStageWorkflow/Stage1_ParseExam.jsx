import { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import Button from '../../../common/Button';
import Loading from '../../../common/Loading';
import Card from '../../../common/Card';
import MathRenderer from '../../../common/MathRenderer';
import { parseQuestionsWithAI, extractImagesFromFile } from '../../../../services/aiFileProcessor';
import './ThreeStageWorkflow.css';

/**
 * Màn hình 1: Parse đề thi
 * - Upload file đề (DOCX/PDF)
 * - AI parse text + extract hình ảnh
 * - User mapping hình ảnh vào câu hỏi
 * - AI lắp ghép và lưu
 */
export default function Stage1_ParseExam({ apiKey, onComplete }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('upload'); // upload, mapping, preview
  
  // Data từ AI
  const [questions, setQuestions] = useState([]);
  const [extractedImages, setExtractedImages] = useState([]); // [{imageId, base64, detectedQuestion?}]
  const [fullExamImage, setFullExamImage] = useState(null); // Ảnh nguyên đề (preview only)
  
  // Mapping state
  const [imageMappings, setImageMappings] = useState({}); // {imageId: {questionId, part, questionNumber}}

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    setFiles(selectedFiles);
  };

  const handleParse = async () => {
    if (files.length === 0 || !apiKey) {
      alert('Vui lòng chọn file và nhập API Key');
      return;
    }

    setLoading(true);
    try {
      console.log('[Stage1] Đang parse đề thi...');
      
      // Bước 1: Parse text từ file
      const parsedQuestions = await parseQuestionsWithAI(files, apiKey);
      console.log('[Stage1] Đã parse được', parsedQuestions.length, 'câu hỏi');
      
      // Bước 2: Extract hình ảnh từ file
      console.log('[Stage1] Đang extract hình ảnh...');
      const images = await extractImagesFromFile(files[0], apiKey);
      console.log('[Stage1] Đã extract được', images.length, 'hình ảnh');
      
      setQuestions(parsedQuestions);
      setExtractedImages(images.map((img, idx) => ({
        imageId: `img_${idx + 1}`,
        base64: img.base64,
        detectedQuestion: img.detectedQuestion || null, // AI detect thuộc câu nào
        fileName: img.fileName || `Hình ${idx + 1}`
      })));
      
      // Tạo ảnh preview toàn bộ đề (nếu là PDF, convert page đầu)
      if (files[0].type === 'application/pdf') {
        // TODO: Convert PDF page đầu sang ảnh để preview
        // Tạm thời để null
        setFullExamImage(null);
      }
      
      setStep('mapping');
    } catch (error) {
      console.error('[Stage1] Lỗi parse:', error);
      alert('Lỗi khi parse đề thi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageMapping = (imageId, questionId, part, questionNumber) => {
    setImageMappings(prev => ({
      ...prev,
      [imageId]: { questionId, part, questionNumber }
    }));
  };

  const handleAutoMap = () => {
    // AI đã detect, tự động map
    const newMappings = {};
    extractedImages.forEach(img => {
      if (img.detectedQuestion) {
        const question = questions.find(q => 
          q.part === img.detectedQuestion.part &&
          q.questionNumber === img.detectedQuestion.questionNumber
        );
        if (question) {
          newMappings[img.imageId] = {
            questionId: question.id || `q_${questions.indexOf(question)}`,
            part: question.part,
            questionNumber: question.questionNumber
          };
        }
      }
    });
    setImageMappings(newMappings);
  };

  const handleAssemble = async () => {
    // Lắp ghép hình ảnh vào câu hỏi
    const assembledQuestions = questions.map(q => {
      const questionImages = extractedImages
        .filter(img => {
          const mapping = imageMappings[img.imageId];
          return mapping && 
                 mapping.part === q.part && 
                 mapping.questionNumber === q.questionNumber;
        })
        .map(img => ({
          imageId: img.imageId,
          base64: img.base64,
          fileName: img.fileName
        }));
      
      return {
        ...q,
        images: questionImages
      };
    });
    
    setQuestions(assembledQuestions);
    setStep('preview');
  };

  const handleSave = async () => {
    // Lưu vào Firebase (chỉ lưu hình minh họa, không lưu ảnh đề)
    // TODO: Implement save to Firebase
    console.log('[Stage1] Lưu questions với images:', questions);
    
    if (onComplete) {
      onComplete({
        questions,
        stage: 1
      });
    }
  };

  if (loading) {
    return (
      <Card className="stage-card">
        <Loading message="AI đang parse đề thi và extract hình ảnh..." />
      </Card>
    );
  }

  if (step === 'upload') {
    return (
      <Card className="stage-card">
        <h2>Bước 1: Parse đề thi</h2>
        <p className="stage-description">
          Upload file đề thi (DOCX/PDF). AI sẽ parse text và extract hình ảnh tự động.
        </p>
        
        <div className="upload-section">
          <input
            type="file"
            accept=".doc,.docx,.pdf"
            onChange={handleFileChange}
            multiple={false}
            className="file-input"
          />
          {files.length > 0 && (
            <div className="file-list">
              <p>Đã chọn: {files.map(f => f.name).join(', ')}</p>
            </div>
          )}
          
          <Button onClick={handleParse} disabled={files.length === 0 || !apiKey}>
            Parse đề thi
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'mapping') {
    return (
      <Card className="stage-card">
        <h2>Bước 1: Map hình ảnh vào câu hỏi</h2>
        <p className="stage-description">
          AI đã extract được {extractedImages.length} hình ảnh. Vui lòng map vào câu hỏi tương ứng.
        </p>

        {/* Preview ảnh nguyên đề (nếu có) */}
        {fullExamImage && (
          <div className="full-exam-preview">
            <h3>Preview đề thi</h3>
            <img src={fullExamImage} alt="Đề thi" className="full-exam-image" />
          </div>
        )}

        {/* Danh sách hình ảnh đã extract */}
        <div className="images-section">
          <h3>Hình ảnh đã extract ({extractedImages.length})</h3>
          <Button variant="secondary" onClick={handleAutoMap} className="auto-map-btn">
            Tự động map (AI đã detect)
          </Button>
          
          <div className="images-grid">
            {extractedImages.map(img => {
              const mapping = imageMappings[img.imageId];
              return (
                <div key={img.imageId} className="image-item">
                  <img src={img.base64} alt={img.fileName} className="extracted-image" />
                  <p className="image-label">{img.fileName}</p>
                  
                  {/* Mapping selector */}
                  <div className="mapping-selector">
                    <label>Map vào câu:</label>
                    <select
                      value={mapping ? `${mapping.part}_${mapping.questionNumber}` : ''}
                      onChange={(e) => {
                        const [part, questionNumber] = e.target.value.split('_');
                        const question = questions.find(q => 
                          q.part === part && q.questionNumber === parseInt(questionNumber)
                        );
                        if (question) {
                          handleImageMapping(
                            img.imageId,
                            question.id || `q_${questions.indexOf(question)}`,
                            part,
                            parseInt(questionNumber)
                          );
                        }
                      }}
                    >
                      <option value="">-- Chọn câu --</option>
                      {questions.map((q, idx) => (
                        <option key={idx} value={`${q.part}_${q.questionNumber}`}>
                          {q.partName || `PHẦN ${q.part}`} - Câu {q.questionNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {mapping && (
                    <p className="mapping-info">
                      ✓ Đã map: {mapping.partName || `PHẦN ${mapping.part}`} - Câu {mapping.questionNumber}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="stage-actions">
          <Button variant="secondary" onClick={() => setStep('upload')}>
            Quay lại
          </Button>
          <Button 
            onClick={handleAssemble}
            disabled={Object.keys(imageMappings).length === 0}
          >
            Lắp ghép và xem preview ({Object.keys(imageMappings).length}/{extractedImages.length} hình đã map)
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'preview') {
    return (
      <Card className="stage-card">
        <h2>Bước 1: Preview đề thi đã parse</h2>
        <p className="stage-description">
          Đã parse được {questions.length} câu hỏi với hình ảnh đã lắp ghép.
        </p>

        <div className="questions-preview">
          {questions.map((q, idx) => (
            <div key={idx} className="question-preview-item">
              <div className="question-header">
                <span className="question-label">
                  {q.partName || `PHẦN ${q.part}`} - Câu {q.questionNumber}
                </span>
                <span className="question-type">{q.type}</span>
              </div>
              <div className="question-content">
                <MathRenderer content={q.content} />
              </div>
              
              {/* Hiển thị hình ảnh nếu có */}
              {q.images && q.images.length > 0 && (
                <div className="question-images">
                  {q.images.map(img => (
                    <img key={img.imageId} src={img.base64} alt={img.fileName} className="question-image" />
                  ))}
                </div>
              )}
              
              {q.options && (
                <div className="question-options">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx}>
                      <MathRenderer content={opt} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="stage-actions">
          <Button variant="secondary" onClick={() => setStep('mapping')}>
            Quay lại
          </Button>
          <Button onClick={handleSave}>
            Lưu và tiếp tục bước 2
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}

