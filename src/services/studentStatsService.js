/**
 * Service để tính toán và cập nhật thống kê học sinh
 * - Tính điểm theo 4 phần (PHẦN I, II, III, IV)
 * - Tạo AI gợi ý real-time khi chấm tự luận
 */

import { databaseService } from './database';
import { callGeminiAPI } from './geminiService';

/**
 * Cập nhật thống kê học sinh sau khi chấm bài
 * @param {string} studentId - ID học sinh
 * @param {Object} examResult - Kết quả thi {score, maxScore, partScores, examId, subject}
 */
export async function updateStudentStats(studentId, examResult) {
  try {
    // Load thống kê hiện tại
    const currentStats = await databaseService.read(`studentStats/${studentId}`) || {
      subjects: {},
      aiSuggestions: []
    };

    const subject = examResult.subject || 'Toán';
    const subjectStats = currentStats.subjects[subject] || {
      totalExams: 0,
      totalScore: 0,
      maxScore: 0,
      partScores: {
        I: { total: 0, max: 0 },
        II: { total: 0, max: 0 },
        III: { total: 0, max: 0 },
        IV: { total: 0, max: 0 }
      }
    };

    // Cập nhật tổng điểm
    subjectStats.totalExams += 1;
    subjectStats.totalScore += examResult.score || 0;
    subjectStats.maxScore += examResult.maxScore || 0;

    // Cập nhật điểm theo phần
    if (examResult.partScores) {
      Object.keys(examResult.partScores).forEach(part => {
        if (subjectStats.partScores[part]) {
          subjectStats.partScores[part].total += examResult.partScores[part].score || 0;
          subjectStats.partScores[part].max += examResult.partScores[part].maxScore || 0;
        }
      });
    }

    // Tính điểm trung bình
    subjectStats.averageScore = subjectStats.maxScore > 0
      ? (subjectStats.totalScore / subjectStats.maxScore) * 100
      : 0;

    // Tính điểm trung bình theo phần
    Object.keys(subjectStats.partScores).forEach(part => {
      const partData = subjectStats.partScores[part];
      if (partData.max > 0) {
        partData.average = (partData.total / partData.max) * 100;
      } else {
        partData.average = 0;
      }
    });

    // Lưu lại
    currentStats.subjects[subject] = subjectStats;
    await databaseService.update(`studentStats/${studentId}`, currentStats);

    return currentStats;
  } catch (error) {
    console.error('Error updating student stats:', error);
    throw error;
  }
}

/**
 * Tạo AI gợi ý real-time khi chấm tự luận
 * @param {string} studentId - ID học sinh
 * @param {Object} essayResult - Kết quả chấm tự luận {questionId, score, maxScore, feedback, part}
 * @param {string} apiKey - Gemini API key
 */
export async function generateAISuggestion(studentId, essayResult, apiKey) {
  try {
    // Load thống kê hiện tại để context
    const stats = await databaseService.read(`studentStats/${studentId}`) || { subjects: {} };
    const subject = essayResult.subject || 'Toán';
    const subjectStats = stats.subjects[subject] || {};

    // Load lịch sử làm bài gần đây
    const examResults = await databaseService.read('examResults');
    const studentResults = [];
    if (examResults) {
      Object.entries(examResults).forEach(([examId, results]) => {
        const result = results[studentId];
        if (result && result.subject === subject) {
          studentResults.push({
            examId,
            score: result.score,
            maxScore: result.maxScore,
            partScores: result.partScores
          });
        }
      });
    }

    const prompt = `Bạn là một giáo viên AI chuyên phân tích kết quả học tập và đưa ra gợi ý cải thiện.

THÔNG TIN HỌC SINH:
- Môn học: ${subject}
- Điểm trung bình: ${subjectStats.averageScore?.toFixed(1) || 0}%
- Điểm theo phần:
  + PHẦN I (Trắc nghiệm): ${subjectStats.partScores?.I?.average?.toFixed(1) || 0}%
  + PHẦN II (Đúng/Sai): ${subjectStats.partScores?.II?.average?.toFixed(1) || 0}%
  + PHẦN III (Trả lời ngắn): ${subjectStats.partScores?.III?.average?.toFixed(1) || 0}%
  + PHẦN IV (Tự luận): ${subjectStats.partScores?.IV?.average?.toFixed(1) || 0}%

KẾT QUẢ BÀI TỰ LUẬN VỪA CHẤM:
- Phần: ${essayResult.part || 'IV'}
- Điểm: ${essayResult.score}/${essayResult.maxScore}
- Feedback: ${essayResult.feedback || 'Chưa có feedback'}

NHIỆM VỤ:
Đưa ra 1 gợi ý ngắn gọn, cụ thể và khuyến khích để học sinh cải thiện. Gợi ý phải:
- Dựa trên điểm yếu hiện tại (phần nào điểm thấp)
- Liên quan đến bài tự luận vừa chấm
- Tích cực và khuyến khích
- Ngắn gọn (tối đa 2 câu)

OUTPUT (JSON):
{
  "message": "Gợi ý ngắn gọn",
  "subject": "${subject}",
  "part": "${essayResult.part || 'IV'}",
  "priority": "high|medium|low"
}

Trả về CHỈ JSON object, không có markdown.`;

    const result = await callGeminiAPI(prompt, apiKey);
    
    if (result && result.message) {
      // Thêm vào danh sách gợi ý (giới hạn 10 gợi ý gần nhất)
      const currentStats = await databaseService.read(`studentStats/${studentId}`) || {
        subjects: {},
        aiSuggestions: []
      };

      const newSuggestion = {
        ...result,
        timestamp: Date.now(),
        examId: essayResult.examId
      };

      currentStats.aiSuggestions = [
        newSuggestion,
        ...(currentStats.aiSuggestions || []).slice(0, 9) // Giữ 10 gợi ý gần nhất
      ];

      await databaseService.update(`studentStats/${studentId}`, currentStats);
      
      return newSuggestion;
    }

    return null;
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return null;
  }
}

/**
 * Tính điểm theo phần từ kết quả thi
 * @param {Object} examResult - Kết quả thi {score, maxScore, questionResults}
 * @param {Array} questions - Danh sách câu hỏi với part
 */
export function calculatePartScores(examResult, questions) {
  const partScores = {
    I: { score: 0, maxScore: 0 },
    II: { score: 0, maxScore: 0 },
    III: { score: 0, maxScore: 0 },
    IV: { score: 0, maxScore: 0 }
  };

  if (examResult.questionResults && questions) {
    questions.forEach((q, index) => {
      const part = q.part || 'I';
      const questionResult = examResult.questionResults[index];
      
      if (questionResult) {
        if (partScores[part]) {
          partScores[part].score += questionResult.score || 0;
          partScores[part].maxScore += questionResult.maxScore || q.points || 1;
        }
      }
    });
  }

  return partScores;
}

