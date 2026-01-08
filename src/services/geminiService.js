/**
 * Service để gọi Gemini API với fallback mechanism
 * 
 * Model priority:
 * 1. gemini-1.5-flash: Nhanh, rẻ, phù hợp cho parse text (ưu tiên)
 * 2. gemini-1.5-pro: Chất lượng cao hơn, fallback khi flash bị limit
 * 3. gemini-pro: Model ổn định, fallback cuối cùng
 */

// Thử cả v1beta và v1
const API_VERSIONS = ['v1beta', 'v1'];

// Danh sách models theo thứ tự ưu tiên - models từ Google AI Studio
const MODELS = [
  'gemini-2.5-flash',      // Model mới nhất từ AI Studio
  'gemini-3-flash',        // Model mới nhất từ AI Studio
  'gemini-2.5-flash-lite', // Model từ AI Studio
  'gemini-1.5-flash-002',  // Version cụ thể với suffix
  'gemini-1.5-pro-002',    // Version cụ thể với suffix
  'gemini-1.5-flash-001',  // Version cụ thể với suffix
  'gemini-1.5-pro-001',    // Version cụ thể với suffix
  'gemini-1.5-flash',      // Không có suffix (fallback)
  'gemini-1.5-pro',        // Không có suffix (fallback)
  'gemini-pro'             // Fallback cũ
];

const REQUEST_TIMEOUT = 60000; // 60 giây
const MAX_RETRIES = 3;

/**
 * Gọi Gemini API để parse đề thi và tạo câu hỏi
 */
export async function parseExamPaperWithGemini(text, apiKey) {
  const prompt = `Bạn là một hệ thống AI chuyên phân tích đề thi và tạo câu hỏi.

Nhiệm vụ: Phân tích đề thi sau và tạo danh sách câu hỏi theo format JSON.

Format output:
[
  {
    "type": "multiple_choice|true_false|short_answer|essay",
    "content": "Nội dung câu hỏi",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (chỉ có khi type là multiple_choice),
    "correctAnswer": "Đáp án đúng",
    "explanation": "Giải thích (nếu có)",
    "subject": "Môn học (ví dụ: Toán, Lý, Hóa...)",
    "difficulty": "easy|medium|hard"
  }
]

Lưu ý:
- Phân loại câu hỏi theo các phần: Trắc nghiệm nhiều phương án (multiple_choice), Đúng/Sai (true_false), Trả lời ngắn (short_answer), Tự luận (essay)
- Với câu trắc nghiệm, extract đầy đủ 4 đáp án A, B, C, D
- Với câu đúng/sai, correctAnswer là "Đúng" hoặc "Sai"
- Với câu tự luận, correctAnswer là đáp án mẫu
- Xác định môn học từ nội dung đề thi
- Đánh giá độ khó dựa trên nội dung câu hỏi

Đề thi:
${text}

Trả về chỉ JSON array, không có text thừa.`;

  return await callGeminiAPIWithFallback(prompt, apiKey);
}

/**
 * Gọi Gemini API để parse đề thi kết hợp với đáp án
 */
export async function parseExamWithAnswers(text, answers, apiKey, answerType = 'answer_sheet') {
  let prompt = '';
  
  if (answerType === 'answer_sheet') {
    prompt = `Bạn là một hệ thống AI chuyên phân tích đề thi và đáp án để tạo câu hỏi.

Nhiệm vụ: Phân tích đề thi và đáp án sau, sau đó tạo danh sách câu hỏi với đáp án đúng.

Đề thi:
${text}

Đáp án (format JSON):
${JSON.stringify(answers, null, 2)}

Format output:
[
  {
    "type": "multiple_choice|true_false|short_answer",
    "content": "Nội dung câu hỏi",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (chỉ có khi type là multiple_choice),
    "correctAnswer": "Đáp án đúng từ bảng đáp án",
    "explanation": "",
    "subject": "Môn học",
    "difficulty": "easy|medium|hard"
  }
]

Lưu ý:
- Match câu hỏi trong đề thi với đáp án trong bảng đáp án
- Với câu đúng/sai có nhiều ý (ví dụ: SĐSĐ), tách thành nhiều câu hỏi riêng biệt
- Với câu trắc nghiệm, correctAnswer là A, B, C hoặc D
- Với câu đúng/sai, correctAnswer là "Đúng" hoặc "Sai"
- Với câu trả lời ngắn, correctAnswer là giá trị từ bảng đáp án

Trả về chỉ JSON array, không có text thừa.`;
  } else if (answerType === 'essay_answer') {
    prompt = `Bạn là một hệ thống AI chuyên phân tích đề thi tự luận và đáp án.

Nhiệm vụ: Phân tích đề thi tự luận và đáp án mẫu, sau đó tạo câu hỏi tự luận.

Đề thi:
${text}

Đáp án mẫu (format JSON):
${JSON.stringify(answers, null, 2)}

Format output:
[
  {
    "type": "essay",
    "content": "Nội dung câu hỏi tự luận",
    "correctAnswer": "Đáp án mẫu từ file đáp án",
    "explanation": "",
    "subject": "Môn học",
    "difficulty": "easy|medium|hard"
  }
]

Lưu ý:
- Match câu hỏi tự luận trong đề thi với đáp án mẫu
- correctAnswer là đáp án mẫu đầy đủ từ file đáp án
- Với câu tự luận, học sinh sẽ upload ảnh bài làm và AI sẽ chấm điểm

Trả về chỉ JSON array, không có text thừa.`;
  }
  
  return await callGeminiAPIWithFallback(prompt, apiKey);
}

/**
 * Gọi Gemini API với fallback mechanism
 */
export async function callGeminiAPIWithFallback(prompt, apiKey, retryCount = 0) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key không được để trống. Vui lòng cập nhật API Key trong cài đặt.');
  }
  
  let lastError = null;
  
  // Thử từng API version và model
  for (const apiVersion of API_VERSIONS) {
    const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${apiVersion}/models`;
    
    for (const model of MODELS) {
      try {
        console.log(`[Gemini] Đang thử ${apiVersion}/${model}`);
        const result = await callGeminiAPI(prompt, apiKey, model, apiVersion, GEMINI_API_BASE);
        console.log(`[Gemini] Thành công với ${apiVersion}/${model}`);
        return result;
      } catch (error) {
        console.warn(`[Gemini] ${apiVersion}/${model} thất bại:`, error.message);
        lastError = error;
        
        // Nếu là lỗi API key, không cần thử tiếp
        if (error.message.includes('API Key không hợp lệ')) {
          throw error;
        }
        
        // Nếu là 404, thử model/version tiếp theo
        if (error.status === 404 || error.message.includes('not found') || error.message.includes('not supported')) {
          console.log(`[Gemini] ${apiVersion}/${model} không tồn tại, thử tiếp...`);
          continue; // Thử model/version tiếp theo
        }
        
        // Nếu là rate limit (429) hoặc quota exceeded, thử model tiếp theo
        if (error.status === 429 || error.message.includes('quota') || error.message.includes('limit')) {
          console.log(`[Gemini] ${apiVersion}/${model} bị limit, thử tiếp...`);
          continue; // Thử model tiếp theo
        }
        
        // Nếu là lỗi khác (timeout, network, ...), thử lại
        if (retryCount < MAX_RETRIES) {
          console.log(`[Gemini] Retry ${retryCount + 1}/${MAX_RETRIES} với ${apiVersion}/${model}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return await callGeminiAPIWithFallback(prompt, apiKey, retryCount + 1);
        }
      }
    }
  }
  
  // Nếu tất cả models đều thất bại, tạo thông báo lỗi chi tiết
  let errorMessage = '❌ Không thể kết nối đến AI. ';
  
  // Nếu tất cả models đều 404, rất có thể là API Key không có quyền
  const all404 = lastError && lastError.status === 404;
  
  if (all404) {
    errorMessage += '\n\n🔑 VẤN ĐỀ: API Key của bạn không có quyền truy cập các model Gemini.\n\n';
    errorMessage += '📋 CÁCH KHẮC PHỤC:\n';
    errorMessage += '1. Truy cập: https://aistudio.google.com/app/apikey\n';
    errorMessage += '2. Tạo API Key mới hoặc kiểm tra API Key hiện tại\n';
    errorMessage += '3. Đảm bảo API Key có quyền truy cập Generative Language API\n';
    errorMessage += '4. Nếu dùng Google Cloud, cần bật "Generative Language API" trong Google Cloud Console\n';
    errorMessage += '5. Kiểm tra API Key có còn hiệu lực không\n\n';
    errorMessage += '💡 LƯU Ý: API Key từ AI Studio thường đã có quyền sẵn. Nếu vẫn lỗi, hãy tạo API Key mới.';
  } else if (lastError) {
    if (lastError.status === 401 || lastError.status === 403) {
      errorMessage += 'API Key không hợp lệ hoặc đã hết hạn. ';
      errorMessage += 'Vui lòng tạo API Key mới tại: https://aistudio.google.com/app/apikey';
    } else if (lastError.message.includes('quota') || lastError.message.includes('limit')) {
      errorMessage += 'Đã vượt quá giới hạn sử dụng API. ';
      errorMessage += 'Vui lòng đợi hoặc nâng cấp gói API.';
    } else if (lastError.message.includes('network') || lastError.message.includes('fetch')) {
      errorMessage += 'Lỗi kết nối mạng. ';
      errorMessage += 'Vui lòng kiểm tra kết nối internet.';
    } else {
      errorMessage += `Lỗi: ${lastError.message}. `;
    }
  } else {
    errorMessage += 'Không thể kết nối đến server. ';
  }
  
  throw new Error(errorMessage);
}

/**
 * Gọi Gemini API với model cụ thể
 */
async function callGeminiAPI(prompt, apiKey, model = MODELS[0], apiVersion = 'v1beta', apiBase = null) {
  const GEMINI_API_BASE = apiBase || `https://generativelanguage.googleapis.com/${apiVersion}/models`;
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  
  // Tạo AbortController cho timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Thấp hơn để output ổn định hơn
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Xử lý lỗi HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Gemini API error: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.model = model;
      error.errorData = errorData;
      
      // Log chi tiết lỗi để debug
      console.error(`[Gemini] Model ${model} failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Nếu là 401/403, API key có vấn đề, không cần thử tiếp
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API Key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API Key trong cài đặt.`);
      }
      
      throw error;
    }
    
    const data = await response.json();
    
    // Extract text từ response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      // Kiểm tra nếu có lỗi trong response
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Response bị chặn bởi safety filter');
      }
      throw new Error('Không nhận được response từ Gemini API');
    }
    
    // Parse JSON từ text (có thể có markdown code block)
    let jsonText = text.trim();
    
    // Loại bỏ markdown code block nếu có
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      const firstLine = lines[0];
      jsonText = lines.slice(1, -1).join('\n').trim();
      
      // Nếu có language tag, loại bỏ
      if (firstLine.includes('json')) {
        // Đã loại bỏ ở trên
      }
    }
    
    // Parse JSON
    let questions;
    try {
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      // Thử extract JSON từ text nếu có text thừa
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Không thể parse JSON từ response: ${parseError.message}`);
      }
    }
    
    if (!Array.isArray(questions)) {
      throw new Error('Response không phải là array');
    }
    
    return questions;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Xử lý timeout
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout sau ${REQUEST_TIMEOUT / 1000} giây`);
      timeoutError.status = 408;
      throw timeoutError;
    }
    
    // Re-throw error để fallback mechanism xử lý
    throw error;
  }
}
