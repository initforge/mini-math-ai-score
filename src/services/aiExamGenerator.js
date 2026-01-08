import { callGeminiAPIWithFallback } from './geminiService';

/**
 * Tạo đề thi mới từ các đề thi template bằng AI
 * AI sẽ xào xáo: đổi số, đổi dạng, đổi ngôn từ nhưng giữ nguyên bản chất
 */
export async function generateExamFromTemplates(examTemplates, apiKey) {
  if (!examTemplates || examTemplates.length === 0) {
    throw new Error('Không có đề thi nào được chọn');
  }

  // Chuẩn bị dữ liệu cho AI
  const examData = examTemplates.map(exam => ({
    title: exam.title || `Đề thi ${exam.subject}`,
    subject: exam.subject,
    duration: exam.duration,
    questions: exam.questions || []
  }));

  const prompt = `Bạn là một giáo viên chuyên nghiệp. Nhiệm vụ của bạn là tạo đề thi mới từ các đề thi mẫu đã cho.

YÊU CẦU:
1. Xào xáo và biến đổi các câu hỏi từ đề thi mẫu để tạo đề thi mới
2. Các hình thức biến đổi:
   - Đổi số trong bài toán (ví dụ: 2x + 3 = 7 → 3x + 5 = 11)
   - Đổi dạng câu hỏi một chút (ví dụ: "Tính giá trị" → "Tìm nghiệm")
   - Đổi ngôn từ, cách diễn đạt (ví dụ: "Giải phương trình" → "Tìm x thỏa mãn")
   - Thay đổi đáp án tương ứng với số đã đổi
3. QUAN TRỌNG: Giữ nguyên bản chất và độ khó của câu hỏi
4. Không thay đổi loại câu hỏi (multiple_choice, true_false, short_answer, essay)
5. Đảm bảo đáp án mới phải chính xác với câu hỏi mới

DỮ LIỆU ĐỀ THI MẪU:
${JSON.stringify(examData, null, 2)}

Hãy tạo đề thi mới với các câu hỏi đã được xào xáo. Trả về JSON array với format:
[
  {
    "subject": "Tên môn học",
    "type": "multiple_choice|true_false|short_answer|essay",
    "difficulty": "easy|medium|hard",
    "content": "Nội dung câu hỏi mới",
    "options": ["A", "B", "C", "D"] hoặc null,
    "correctAnswer": "Đáp án đúng",
    "explanation": "Giải thích (nếu có)"
  },
  ...
]

Chỉ trả về JSON, không có text thêm.`;

  try {
    const questions = await callGeminiAPIWithFallback(prompt, apiKey);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI không tạo được câu hỏi nào');
    }
    
    return questions;
  } catch (error) {
    console.error('Error generating exam from templates:', error);
    throw new Error(`Lỗi khi tạo đề thi: ${error.message}`);
  }
}

