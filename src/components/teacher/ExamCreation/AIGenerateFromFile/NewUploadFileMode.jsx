import { useState } from 'react';
import Step1UploadExam from './Step1UploadExam';
import Step2UploadAnswers from './Step2UploadAnswers';
import Step3UploadEssayAnswers from './Step3UploadEssayAnswers';
import { databaseService } from '../../../../services/database';
import { useAuth } from '../../../../contexts/AuthContext';
import { useApiKey } from '../../../../contexts/ApiKeyContext';
import { logService } from '../../../../services/logService';
import './NewUploadFileMode.css';

/**
 * Flow mới: 3 màn hình riêng biệt
 * - Màn hình 1: Upload đề thi + ảnh hình + ghi chú
 * - Màn hình 2: Upload đáp án trắc nghiệm
 * - Màn hình 3: Upload đáp án tự luận
 */
export default function NewUploadFileMode({ apiKey: propApiKey }) {
  const { apiKey: contextApiKey } = useApiKey();
  // Ưu tiên: props > context > localStorage
  const apiKey = propApiKey || contextApiKey || localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY');

  // Debug: Log API Key status
  console.log('[NewUploadFileMode] API Key status:', {
    hasPropApiKey: !!propApiKey,
    hasContextApiKey: !!contextApiKey,
    hasLocalStorageKey: !!(localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY')),
    finalApiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING'
  });

  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1, 2, 3
  const [questions, setQuestions] = useState([]);
  const [examFilePreview, setExamFilePreview] = useState(null);
  const [essayAnswerImages, setEssayAnswerImages] = useState([]);

  // Step 1: Questions parsed
  const handleQuestionsParsed = (parsedQuestions, preview) => {
    setQuestions(parsedQuestions);
    setExamFilePreview(preview);
    setStep(2);
  };

  // Step 2: Answers parsed
  const handleAnswersParsed = (questionsWithAnswers) => {
    setQuestions(questionsWithAnswers);
    setStep(3);
  };

  // Step 3: Complete
  const handleComplete = async (finalQuestions, essayImages) => {
    try {
      console.log('[NewUploadFileMode] ======================== SAVING QUESTIONS ========================');
      console.log('[NewUploadFileMode] Total questions:', finalQuestions.length);

      // Lưu câu hỏi vào database
      const savedQuestions = [];
      let examSubject = 'Toán';
      let examDuration = 60;

      for (const question of finalQuestions) {
        // Log chi tiết cho câu tự luận
        if (question.type === 'essay') {
          console.log('[NewUploadFileMode] Essay question BEFORE save:', {
            id: question.id,
            questionNumber: question.questionNumber,
            hasBarem: !!question.barem,
            baremType: typeof question.barem,
            baremLength: Array.isArray(question.barem) ? question.barem.length : 'not array',
            barem: question.barem,
            baremTotalPoints: question.baremTotalPoints,
            baremNotes: question.baremNotes,
            baremHasImage: question.baremHasImage
          });
        }

        const questionData = {
          subject: question.subject || 'Toán',
          type: question.type,
          difficulty: question.difficulty || 'medium',
          content: question.content,
          options: question.options || null,
          // ✅ CRITICAL: Lưu subQuestions cho câu đúng sai (true_false)
          subQuestions: question.subQuestions || null,
          correctAnswer: question.type === 'essay' ? null : (question.correctAnswer || null),
          explanation: question.explanation || '',
          images: question.images || null, // Ảnh hình (base64)
          essayAnswerBase64: question.essayAnswerBase64 || null, // Đáp án tự luận
          // ✅ CRITICAL: Chỉ set default nếu KHÔNG có barem (undefined/null)
          // KHÔNG dùng || vì nó sẽ convert [] thành truthy và overwrite
          barem: question.barem !== undefined && question.barem !== null ? question.barem : [],
          baremTotalPoints: question.baremTotalPoints !== undefined && question.baremTotalPoints !== null ? question.baremTotalPoints : 0,
          baremNotes: question.baremNotes !== undefined && question.baremNotes !== null ? question.baremNotes : '',
          baremHasImage: question.baremHasImage !== undefined && question.baremHasImage !== null ? question.baremHasImage : false,
          part: question.part,
          partName: question.partName,
          examCode: question.examCode,
          createdBy: user.id,
          usageCount: 0
        };

        if (question.type === 'essay') {
          console.log('[NewUploadFileMode] Essay questionData AFTER prepare:', {
            hasBarem: !!questionData.barem,
            baremType: typeof questionData.barem,
            baremLength: Array.isArray(questionData.barem) ? questionData.barem.length : 'not array'
          });
        }

        const questionId = await databaseService.create('questions', questionData);
        savedQuestions.push({ id: questionId, ...questionData });

        // ✅ DEBUG: Log sau khi save vào database
        if (question.type === 'essay') {
          console.log('[NewUploadFileMode] Essay question AFTER database save:', {
            questionId,
            hasBarem: !!questionData.barem,
            baremInSavedQuestions: !!savedQuestions[savedQuestions.length - 1].barem,
            savedQuestionData: savedQuestions[savedQuestions.length - 1]
          });
        }

        if (savedQuestions.length === 1) {
          examSubject = question.subject || 'Toán';
        }
      }

      // Tạo đề thi
      const examData = {
        title: `Đề thi ${examSubject} - ${new Date().toLocaleDateString('vi-VN')}`,
        subject: examSubject,
        duration: examDuration,
        questions: savedQuestions,
        createdBy: user.id,
        isPublic: false,
        isAIGenerated: true,
        examFilePreview: examFilePreview, // Preview ảnh đề gốc (không lưu base64, chỉ URL preview)
        createdAt: Date.now(),
        // ✅ Save API key for AI grading (essay questions)
        teacherApiKey: apiKey || null
      };

      const examId = await databaseService.create('examTemplates', examData);

      // Ghi log
      if (user) {
        await logService.logTeacherCreateExam(user.username, examId, examData.title);
      }

      alert(`Đã tạo đề thi thành công với ${savedQuestions.length} câu hỏi!`);

      // Navigate to organize page
      window.location.href = '/teacher/exams/organize';
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Lỗi khi lưu đề thi: ' + error.message);
    }
  };

  return (
    <div className="new-upload-file-mode">
      {/* Progress indicator */}
      <div className="progress-steps">
        <div className={`step-indicator ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Upload đề thi</span>
        </div>
        <div className={`step-indicator ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Đáp án trắc nghiệm</span>
        </div>
        <div className={`step-indicator ${step >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Đáp án tự luận</span>
        </div>
      </div>

      {/* Step content */}
      {step === 1 && (
        <Step1UploadExam
          apiKey={apiKey}
          onNext={handleQuestionsParsed}
          onQuestionsParsed={handleQuestionsParsed}
        />
      )}

      {step === 2 && (
        <Step2UploadAnswers
          questions={questions}
          apiKey={apiKey}
          onNext={handleAnswersParsed}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step3UploadEssayAnswers
          questions={questions}
          apiKey={apiKey}
          onBack={() => setStep(2)}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

