import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Helper: Call AI with model fallback chain
 * Priority: Gemini 2.5 models (mạnh nhất) → 2.0 → 1.5
 */
async function callAIWithFallback(apiKey, prompt, imageParts = []) {
  const models = [
    'gemini-2.5-flash',           // Model mới nhất, mạnh nhất
    'gemini-2.0-flash-exp',       // Experimental 2.0
    'gemini-2.0-flash-thinking-exp-1219', // Thinking model
    'gemini-1.5-flash-002',       // Stable 1.5 với version
    'gemini-1.5-pro-002',         // Pro model backup
    'gemini-1.5-flash-latest',    // Latest 1.5
    'gemini-1.5-pro-latest'       // Pro latest
  ];
  
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;
  
  for (const modelName of models) {
    try {
      console.log(`[AI] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const content = imageParts.length > 0 ? [prompt, ...imageParts] : prompt;
      const result = await model.generateContent(content);
      const response = await result.response;
      
      console.log(`[AI] Success with model: ${modelName}`);
      return response.text();
    } catch (error) {
      console.warn(`[AI] Model ${modelName} failed:`, error.message);
      lastError = error;
      
      // If 429 (quota), try next model
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        continue;
      }
      // For other errors, throw immediately
      throw error;
    }
  }
  
  // All models failed
  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

/**
 * Grade multiple choice questions
 */
export function gradeMultipleChoice(questions, answers) {
  const results = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const question of questions) {
    if (question.type !== 'multiple_choice') continue;

    const studentAnswer = answers[question.id] || null; // Default to null if undefined
    const correctAnswer = question.correctAnswer;
    const points = question.points || 1;

    const isCorrect = studentAnswer === correctAnswer;
    const score = isCorrect ? points : 0;

    totalScore += score;
    totalMax += points;

    results.push({
      questionId: question.id,
      type: 'multiple_choice',
      studentAnswer,
      correctAnswer,
      isCorrect,
      score,
      maxScore: points
    });
  }

  return { results, totalScore, totalMax };
}

/**
 * Grade true/false questions with sub-questions
 * Each wrong sub-question deducts 0.25 points
 */
export function gradeTrueFalse(questions, answers) {
  const results = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const question of questions) {
    if (question.type !== 'true_false') continue;

    // Normalize: Chuyển D -> Đ, uppercase, loại bỏ ký tự không hợp lệ
    const normalizeAnswer = (str) => {
      if (!str) return '';
      return str
        .toUpperCase()
        .replace(/D/g, 'Đ')  // Chuyển D -> Đ
        .replace(/[^ĐS]/g, '');  // Chỉ giữ Đ và S
    };

    const studentAnswer = normalizeAnswer(answers[question.id] || '') || null; // Convert empty string to null
    const correctAnswer = normalizeAnswer(question.correctAnswer || '');
    const points = question.points || 1;

    console.log(`[GradeTrueFalse] Question ${question.id}:`, {
      rawStudent: answers[question.id],
      rawCorrect: question.correctAnswer,
      normalizedStudent: studentAnswer,
      normalizedCorrect: correctAnswer,
      points
    });

    totalMax += points;

    // Parse answer string (e.g., "ĐSĐS" -> 4 sub-questions)
    const subCount = correctAnswer.length;

    if (subCount > 0) {
      const pointsPerSub = points / subCount;

      let correctCount = 0;
      let wrongCount = 0;
      const subResults = [];

      for (let i = 0; i < subCount; i++) {
        const studentSub = studentAnswer[i] || '';
        const correctSub = correctAnswer[i] || '';
        const isCorrect = studentSub === correctSub;

        if (isCorrect) {
          correctCount++;
        } else if (studentSub !== '') {
          wrongCount++;
        }

        subResults.push({
          index: i,
          letter: String.fromCharCode(97 + i), // a, b, c, d
          studentAnswer: studentSub,
          correctAnswer: correctSub,
          isCorrect
        });
      }

      // Scoring: start with full points, deduct 0.25 for each wrong answer
      // Example: 1 point question with 4 sub-questions
      // - All correct: 1 point
      // - 2 wrong: 1 - (2 * 0.25) = 0.5 point
      // - 4 wrong: max(0, 1 - (4 * 0.25)) = 0 point
      const score = Math.max(0, points - (wrongCount * 0.25));
      totalScore += score;

      console.log(`[GradeTrueFalse] Result:`, {
        correctCount,
        wrongCount,
        totalSubs: subCount,
        score,
        maxScore: points
      });

      results.push({
        questionId: question.id,
        type: 'true_false',
        studentAnswer,
        correctAnswer,
        subResults,
        correctCount,
        wrongCount,
        score,
        maxScore: points
      });
    } else {
      // Empty correct answer
      const score = 0;
      totalScore += score;

      results.push({
        questionId: question.id,
        type: 'true_false',
        studentAnswer,
        correctAnswer,
        isCorrect: false,
        score,
        maxScore: points
      });
    }
  }

  return { results, totalScore, totalMax };
}

/**
 * Grade short answer questions
 */
export function gradeShortAnswer(questions, answers) {
  const results = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const question of questions) {
    if (question.type !== 'short_answer') continue;

    const rawStudentAnswer = answers[question.id];
    const studentAnswer = rawStudentAnswer ? String(rawStudentAnswer).trim() : '';
    const correctAnswer = (question.correctAnswer || '').trim();
    const points = question.points || 1;

    console.log(`[GradeShortAnswer] Question ${question.id}:`, {
      rawStudent: rawStudentAnswer,
      rawCorrect: question.correctAnswer,
      studentAnswer,
      correctAnswer,
      points
    });
    
    // Skip if no answer
    if (!studentAnswer) {
      results.push({
        questionId: question.id,
        type: 'short_answer',
        studentAnswer: null,
        correctAnswer: question.correctAnswer,
        isCorrect: false,
        score: 0,
        maxScore: points
      });
      totalMax += points;
      continue;
    }

    // Normalize for comparison
    const normalizeAnswer = (str) => {
      if (!str) return '';
      let result = String(str).trim().toLowerCase();

      // Chuẩn hóa dấu phẩy thành dấu chấm (Việt Nam dùng phẩy cho số thập phân)
      result = result.replace(/,/g, '.');

      // Loại bỏ spaces thừa
      result = result.replace(/\s+/g, '');

      // CHỈ loại bỏ dấu câu ở cuối (không loại dấu chấm giữa số)
      result = result.replace(/[;:!?]+$/g, '');

      return result;
    };

    // Kiểm tra nếu cả hai đều là số
    const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);

    const normalizedStudent = normalizeAnswer(studentAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    console.log(`[GradeShortAnswer] Normalized:`, {
      student: normalizedStudent,
      correct: normalizedCorrect,
      studentIsNumeric: isNumeric(normalizedStudent),
      correctIsNumeric: isNumeric(normalizedCorrect)
    });

    // So sánh
    let isCorrect = false;

    if (isNumeric(normalizedStudent) && isNumeric(normalizedCorrect)) {
      // So sánh số học để tránh "21" != "21.0"
      const studentNum = parseFloat(normalizedStudent);
      const correctNum = parseFloat(normalizedCorrect);
      isCorrect = Math.abs(studentNum - correctNum) < 0.0001;

      console.log(`[GradeShortAnswer] Numeric comparison:`, {
        studentNum,
        correctNum,
        diff: Math.abs(studentNum - correctNum),
        isCorrect
      });
    } else {
      // So sánh chuỗi
      isCorrect = normalizedStudent === normalizedCorrect;

      console.log(`[GradeShortAnswer] String comparison:`, {
        isCorrect
      });
    }

    const score = isCorrect ? points : 0;

    totalScore += score;
    totalMax += points;

    console.log(`[GradeShortAnswer] Result:`, {
      isCorrect,
      score
    });

    results.push({
      questionId: question.id,
      type: 'short_answer',
      studentAnswer: rawStudentAnswer || null,
      correctAnswer: question.correctAnswer,
      isCorrect,
      score,
      maxScore: points
    });
  }

  return { results, totalScore, totalMax };
}

/**
 * Grade essay questions using AI with OCR for images
 */
export async function gradeEssay(questions, answers, apiKey) {
  // ⚠️ CRITICAL: Get API key from multiple sources
  let effectiveApiKey = apiKey;
  
  if (!effectiveApiKey) {
    // Try localStorage (teacher/admin API key)
    effectiveApiKey = localStorage.getItem('geminiApiKey') || 
                     localStorage.getItem('gemini_api_key') || 
                     localStorage.getItem('GEMINI_API_KEY');
    console.log('[GradeEssay] Using API key from localStorage');
  }
  
  if (!effectiveApiKey) {
    console.warn('[GradeEssay] ⚠️ No API key available, skipping AI grading for essay questions');
    // Return 0 score for all essay questions
    const results = [];
    let totalScore = 0;
    let totalMax = 0;

    for (const question of questions) {
      if (question.type !== 'essay') continue;
      const points = question.points || 1;
      totalMax += points;

      results.push({
        questionId: question.id,
        type: 'essay',
        studentAnswer: answers[question.id] || '',
        ocrText: '',
        score: 0,
        maxScore: points,
        feedback: '⚠️ Không thể chấm tự động do thiếu API Key. Vui lòng liên hệ giáo viên.',
        aiSuggestion: null
      });
    }

    return { results, totalScore, totalMax };
  }

  console.log('[GradeEssay] ======================== START GRADING ESSAY ========================');
  console.log('[GradeEssay] Number of essay questions:', questions.filter(q => q.type === 'essay').length);
  console.log('[GradeEssay] API Key available:', !!effectiveApiKey);

  const results = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const question of questions) {
    if (question.type !== 'essay') continue;

    const points = question.points || 1;
    totalMax += points;

    const answerData = answers[question.id];
    let studentText = null; // Default to null instead of empty string
    let studentImages = [];

    console.log(`[GradeEssay] Question ${question.id}:`, {
      points,
      hasAnswer: !!answerData,
      answerType: typeof answerData,
      hasCorrectAnswer: !!question.correctAnswer,
      hasBarem: !!question.barem
    });

    // Parse answer data
    if (typeof answerData === 'string') {
      try {
        const parsed = JSON.parse(answerData);
        studentText = parsed.text || null; // null if empty
        studentImages = parsed.images || [];
      } catch {
        studentText = answerData || null;
      }
    } else if (answerData && typeof answerData === 'object') {
      studentText = answerData.text || null;
      studentImages = answerData.images || [];
    }
    
    // Skip if no answer provided
    if (!studentText && (!studentImages || studentImages.length === 0)) {
      console.log(`[GradeEssay] No answer for question ${question.id}, skipping AI grading`);
      results.push({
        questionId: question.id,
        type: 'essay',
        studentAnswer: null,
        ocrText: '',
        score: 0,
        maxScore: points,
        feedback: 'Không có câu trả lời',
        strengths: [],
        weaknesses: ['Không có câu trả lời'],
        aiSuggestion: 'Hãy cố gắng trả lời câu hỏi'
      });
      continue;
    }

    try {
      let ocrText = '';

      // If student uploaded images, OCR them first
      if (studentImages.length > 0) {
        console.log(`[Grading] OCR ${studentImages.length} images for essay question ${question.id}`);

        const imageParts = studentImages.map(base64 => ({
          inlineData: {
            data: base64.split(',')[1],
            mimeType: 'image/jpeg'
          }
        }));

        const ocrPrompt = `Đọc và trích xuất toàn bộ nội dung viết tay từ các ảnh bài làm.
Chỉ trả về nội dung đã đọc được, giữ nguyên format, không thêm giải thích.`;

        ocrText = await callAIWithFallback(effectiveApiKey, ocrPrompt, imageParts);
        console.log(`[Grading] OCR result: ${ocrText.substring(0, 100)}...`);
      }

      // Combine text answer and OCR result
      const fullAnswer = [studentText, ocrText].filter(Boolean).join('\n\n');

      if (!fullAnswer.trim()) {
        results.push({
          questionId: question.id,
          type: 'essay',
          studentAnswer: fullAnswer,
          ocrText,
          score: 0,
          maxScore: points,
          feedback: 'Chưa có câu trả lời',
          aiSuggestion: null
        });
        continue;
      }

      // Grade using AI with barem
      const barem = question.barem || question.correctAnswer || 'Không có đáp án mẫu';
      const baremNotes = question.baremNotes || '';

      console.log(`[GradeEssay] Using barem:`, {
        hasBarem: !!question.barem,
        hasCorrectAnswer: !!question.correctAnswer,
        baremType: typeof barem,
        baremLength: typeof barem === 'string' ? barem.length : 'not string',
        baremNotes: baremNotes.substring(0, 100)
      });

      const gradingPrompt = `Chấm điểm câu tự luận sau theo biểu điểm (barem):

CÂU HỎI:
${question.content}

ĐÁP ÁN HỌC SINH:
${fullAnswer}

BIỂU ĐIỂM (BAREM):
${barem}

GHI CHÚ THÊM:
${baremNotes || 'Không có'}

ĐIỂM TỐI ĐA: ${points}

Hãy chấm điểm chi tiết và đưa ra nhận xét. Trả về JSON:
{
  "score": số điểm thực tế (0-${points}, có thể là số thập phân),
  "feedback": "Nhận xét chi tiết về bài làm, chỉ ra điểm đúng và sai",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm cần cải thiện 1", "Điểm cần cải thiện 2"],
  "suggestions": "Gợi ý cải thiện cho học sinh"
}

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC.`;

      const gradingText = await callAIWithFallback(effectiveApiKey, gradingPrompt);

      const jsonMatch = gradingText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI grading response');
      }

      const grading = JSON.parse(jsonMatch[0]);
      const score = Math.min(Math.max(0, grading.score), points);
      totalScore += score;

      results.push({
        questionId: question.id,
        type: 'essay',
        studentAnswer: fullAnswer,
        ocrText,
        score,
        maxScore: points,
        feedback: grading.feedback,
        strengths: grading.strengths,
        weaknesses: grading.weaknesses,
        aiSuggestion: grading.suggestions
      });

    } catch (error) {
      console.error(`Error grading essay question ${question.id}:`, error);
      results.push({
        questionId: question.id,
        type: 'essay',
        studentAnswer: studentText || null, // Ensure not undefined
        ocrText: '',
        score: 0,
        maxScore: points,
        feedback: 'Lỗi khi chấm điểm tự động',
        error: error.message
      });
    }
  }

  return { results, totalScore, totalMax };
}

/**
 * Generate AI suggestions based on overall exam performance
 */
export async function generateAISuggestions(allResults, questions, apiKey) {
  if (!apiKey) return null;

  try {
    // Calculate part scores
    const partScores = {};
    for (const result of allResults) {
      const question = questions.find(q => q.id === result.questionId);
      if (!question) continue;

      const part = question.part || 'Unknown';
      if (!partScores[part]) {
        partScores[part] = { score: 0, max: 0, count: 0 };
      }
      partScores[part].score += result.score;
      partScores[part].max += result.maxScore;
      partScores[part].count++;
    }

    // Prepare summary
    const summary = Object.entries(partScores).map(([part, data]) => {
      const percentage = (data.score / data.max * 100).toFixed(1);
      return `Phần ${part}: ${data.score}/${data.max} điểm (${percentage}%)`;
    }).join('\n');

    // Find weak areas
    const weakQuestions = allResults.filter(r => {
      const percentage = (r.score / r.maxScore) * 100;
      return percentage < 50;
    });

    const prompt = `Phân tích kết quả thi và đưa ra gợi ý học tập:

TỔNG QUAN:
${summary}

SỐ CÂU SAI HOẶC ĐIỂM THẤP: ${weakQuestions.length}

Hãy đưa ra gợi ý học tập chi tiết. Trả về JSON:
{
  "overallAssessment": "Đánh giá tổng quan ngắn gọn",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
  "studyPlan": ["Kế hoạch học tập 1", "Kế hoạch học tập 2", "Kế hoạch học tập 3"],
  "focusAreas": ["Chủ đề cần ôn tập 1", "Chủ đề cần ôn tập 2"]
}

CHỈ TRẢ VỀ JSON.`;

    const text = await callAIWithFallback(apiKey, prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return null;
  }
}

/**
 * Grade entire exam
 */
export async function gradeExam(questions, answers, apiKey) {
  console.log('[Grading] Starting exam grading...');

  const allResults = [];
  let totalScore = 0;
  let totalMax = 0;

  // Grade multiple choice
  const mcResult = gradeMultipleChoice(questions, answers);
  allResults.push(...mcResult.results);
  totalScore += mcResult.totalScore;
  totalMax += mcResult.totalMax;

  // Grade true/false
  const tfResult = gradeTrueFalse(questions, answers);
  allResults.push(...tfResult.results);
  totalScore += tfResult.totalScore;
  totalMax += tfResult.totalMax;

  // Grade short answer
  const saResult = gradeShortAnswer(questions, answers);
  allResults.push(...saResult.results);
  totalScore += saResult.totalScore;
  totalMax += saResult.totalMax;

  // Grade essay (async with AI)
  const essayResult = await gradeEssay(questions, answers, apiKey);
  allResults.push(...essayResult.results);
  totalScore += essayResult.totalScore;
  totalMax += essayResult.totalMax;

  // Generate AI suggestions
  const aiSuggestions = await generateAISuggestions(allResults, questions, apiKey);

  console.log(`[Grading] Complete: ${totalScore}/${totalMax} points`);

  return {
    results: allResults,
    score: totalScore,
    maxScore: totalMax,
    percentage: (totalScore / totalMax * 100).toFixed(2),
    aiSuggestions,
    gradedAt: Date.now()
  };
}
