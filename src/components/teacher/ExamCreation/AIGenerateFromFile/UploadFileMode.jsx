import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import Button from '../../../common/Button';
import Loading from '../../../common/Loading';
import QuestionPreview from '../QuestionPreview';
import ExamReview from '../ExamReview';
import { parseQuestionsWithAI } from '../../../../services/aiFileProcessor';
import { databaseService } from '../../../../services/database';
import './UploadFileMode.css';

export default function UploadFileMode({ apiKey }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [fileTypes, setFileTypes] = useState({}); // Map file name -> type (sau khi parse)
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [step, setStep] = useState('upload'); // upload, preview, review

  // Lấy extension từ tên file
  const getFileExtension = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    return ext;
  };

  // Lấy màu cho extension
  const getExtensionColor = (ext) => {
    if (ext === 'doc' || ext === 'docx') {
      return '#3b82f6'; // Xanh dương
    } else if (ext === 'xlsx' || ext === 'xls') {
      return '#22c55e'; // Xanh lá
    } else if (ext === 'pdf') {
      return '#ef4444'; // Đỏ
    }
    return '#6b7280'; // Xám mặc định
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    // Merge với files hiện có (tránh duplicate)
    const existingFileNames = new Set(files.map(f => f.name));
    const newFiles = selectedFiles.filter(f => !existingFileNames.has(f.name));
    
    if (newFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Thêm file vào danh sách
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
    
    // Nhận diện sẽ tự động chạy trong useEffect (dùng AI)
  };

  const handleGenerate = async () => {
    if (files.length === 0 || !apiKey || !user) {
      alert('Vui lòng chọn file, nhập API Key và đăng nhập');
      return;
    }

    setLoading(true);
    try {
      console.log('[UploadFileMode] Đang gửi file đến AI để parse...');
      
      // Parse và tạo câu hỏi bằng AI (tự động nhận diện file types bên trong)
      const questions = await parseQuestionsWithAI(files, apiKey);
      console.log('[UploadFileMode] Kết quả parse từ AI:', questions);
      
      if (!questions || questions.length === 0) {
        alert('Không tạo được câu hỏi nào. Vui lòng kiểm tra lại file.');
        return;
      }
      
      // Hiển thị warning nếu có validation warning
      if (questions._validationWarning) {
        alert(questions._validationWarning);
      }
      
      // Lưu câu hỏi vào database và tạo đề thi
      const savedQuestions = [];
      let examSubject = 'Toán';
      let examDuration = 60; // Mặc định 60 phút
      
      for (const question of questions) {
        const questionData = {
          subject: question.subject || 'Toán',
          type: question.type,
          difficulty: question.difficulty || 'medium',
          content: question.content,
          options: question.options || null,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || '',
          createdBy: user.id,
          usageCount: 0
        };
        
        const questionId = await databaseService.create('questions', questionData);
        savedQuestions.push({ id: questionId, ...questionData });
        
        // Lấy subject từ câu hỏi đầu tiên
        if (savedQuestions.length === 1) {
          examSubject = question.subject || 'Toán';
        }
      }
      
      // Tạo đề thi từ các câu hỏi đã parse
      const examData = {
        title: `Đề thi ${examSubject} - ${new Date().toLocaleDateString('vi-VN')}`,
        subject: examSubject,
        duration: examDuration,
        questions: savedQuestions,
        createdBy: user.id,
        isPublic: false,
        isAIGenerated: true,
        createdAt: Date.now()
      };
      
      const examId = await databaseService.create('examTemplates', examData);
      console.log('[UploadFileMode] Đã tạo đề thi:', examId);
      
      setGeneratedQuestions(savedQuestions);
      setSelectedQuestions(savedQuestions.map(q => q.id));
      setStep('preview');
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Lỗi khi tạo câu hỏi: ' + error.message);
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

  const handleSaveToBank = async () => {
    // Đề thi đã được lưu vào database trong quá trình parse
    alert(`Đã tạo đề thi với ${selectedQuestions.length} câu hỏi và lưu vào kho đề thi`);
  };

  const handleCreateExam = () => {
    setStep('review');
  };

  const handleRemoveFile = (fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setFileTypes(prev => {
      const newTypes = { ...prev };
      delete newTypes[fileName];
      return newTypes;
    });
  };

  const handleAddMoreFiles = () => {
    document.getElementById('file-upload').click();
  };

  if (step === 'upload') {
    return (
      <div className="upload-mode">
        {/* Upload area - chỉ hiển thị khi chưa có file */}
        {files.length === 0 && (
          <div className="upload-area">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls"
              onChange={handleFileChange}
              className="file-input"
              id="file-upload"
              multiple
            />
            <label htmlFor="file-upload" className="upload-label">
              <div className="upload-icon">📄</div>
              <p>Chọn file PDF, Word hoặc Excel (có thể chọn nhiều file)</p>
              <p className="upload-hint">Hệ thống sẽ tự động nhận diện loại file</p>
            </label>
          </div>
        )}

        {/* File list - hiển thị khi đã có file */}
        {files.length > 0 && (
          <div className="file-list-container">
            <div className="file-list-header">
              <h4>Danh sách file đã chọn ({files.length})</h4>
              <Button 
                variant="secondary" 
                onClick={handleAddMoreFiles}
                className="add-file-btn"
              >
                + Thêm file
              </Button>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.xls"
                onChange={handleFileChange}
                className="file-input"
                id="file-upload"
                multiple
              />
            </div>
            
            <div className="file-list">
              {files.map((file, index) => {
                const ext = getFileExtension(file.name);
                const extColor = getExtensionColor(ext);
                
                return (
                  <div key={`${file.name}-${index}`} className="file-item">
                    <div className="file-info">
                      <div className="file-name-with-ext">
                        <span className="file-name">{file.name}</span>
                        <span 
                          className="file-extension" 
                          style={{ color: extColor }}
                        >
                          .{ext}
                        </span>
                      </div>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => handleRemoveFile(file.name)}
                      type="button"
                      title="Xóa file"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="generate-btn-wrapper">
            <Button 
              onClick={handleGenerate} 
              disabled={files.length === 0 || !apiKey || loading}
              className="generate-btn"
            >
              {loading ? 'Đang xử lý...' : 'Tạo câu hỏi'}
            </Button>
          </div>
        )}
        
        {loading && (
          <Loading message="AI đang phân tích và tạo câu hỏi..." />
        )}
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="preview-mode">
        <h3>Preview câu hỏi được tạo ({generatedQuestions.length} câu)</h3>
        <QuestionPreview
          questions={generatedQuestions}
          selectedQuestions={selectedQuestions}
          onToggle={handleQuestionToggle}
        />
        <div className="preview-actions">
          <Button variant="secondary" onClick={handleSaveToBank}>
            Đã lưu vào Kho đề thi ({selectedQuestions.length} câu)
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
      questions={generatedQuestions.filter(q => selectedQuestions.includes(q.id))}
      onBack={() => setStep('preview')}
    />
  );
}
