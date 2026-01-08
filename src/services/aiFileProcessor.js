/**
 * Service xử lý file bằng AI - Tối ưu để giảm số request
 * Gửi tất cả file cùng lúc trong 1 request để tiết kiệm
 */

import JSZip from 'jszip';
import * as XLSX from 'xlsx';

/**
 * Clean JSON string - ONLY clean if parse fails, preserve AI response otherwise
 * Strategy: Try parse first, only fix if needed to preserve data integrity
 */
const cleanJsonString = (jsonStr) => {
  if (!jsonStr) return jsonStr;
  
  let cleaned = jsonStr.trim();
  
  // Remove markdown code blocks - handle all variations
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/g, '').replace(/\n?```\s*$/g, '');
  cleaned = cleaned.trim();
  
  // Extract JSON object if wrapped in extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // TRY PARSE FIRST - if AI already returned valid JSON, DON'T TOUCH IT!
  try {
    JSON.parse(cleaned);
    // Success! AI returned valid JSON, return as-is to preserve data
    return cleaned;
  } catch (firstError) {
    // Parse failed - need to clean
    console.log('[AI] 🔧 First parse failed, attempting to fix JSON...');
  }
  
  // ONLY IF PARSE FAILED: Fix unescaped backslashes in string values
  let result = '';
  let i = 0;
  
  while (i < cleaned.length) {
    const char = cleaned[i];
    
    // If we hit a quote, we're entering a string value
    if (char === '"') {
      result += char;
      i++;
      
      // Process the string content until closing quote
      let stringContent = '';
      let insideString = true;
      
      while (i < cleaned.length && insideString) {
        const c = cleaned[i];
        
        if (c === '\\') {
          const next = cleaned[i + 1];
          
          if (next === '"') {
            // Escaped quote \" - keep both
            stringContent += '\\\"';
            i += 2;
          } else if (next === '\\') {
            // Already escaped backslash \\ - keep both
            stringContent += '\\\\';
            i += 2;
          } else if (next === '/') {
            // Escaped slash \/ - keep both
            stringContent += '\\/';
            i += 2;
          } else if (next === 'u') {
            // Unicode \uXXXX - keep both
            stringContent += '\\u';
            i += 2;
          } else if (next === 'n' || next === 't' || next === 'r' || 
                     next === 'b' || next === 'f') {
            // Check if it's LaTeX command or JSON escape
            const nextNext = cleaned[i + 2];
            if (nextNext && /[a-zA-Z]/.test(nextNext)) {
              // Followed by letter = LaTeX command like \newline, \text
              stringContent += '\\\\';
              i++;
            } else {
              // Not followed by letter = JSON escape like \n, \t
              stringContent += '\\' + next;
              i += 2;
            }
          } else {
            // Unescaped backslash - LaTeX command
            stringContent += '\\\\';
            i++;
          }
        } else if (c === '"') {
          // Closing quote
          result += stringContent + '"';
          insideString = false;
          i++;
        } else {
          // Regular character
          stringContent += c;
          i++;
        }
      }
    } else {
      // Not in string - JSON structure
      result += char;
      i++;
    }
  }
  
  return result;
};

/**
 * Extract text từ file (DOCX, Excel)
 */
async function extractFileText(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'docx' || ext === 'doc') {
    const data = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(data);

    // Đọc document.xml chính
    let documentXml = '';
    const docFile = zip.file('word/document.xml');
    if (docFile) {
      documentXml = await docFile.async('string');
    }

    // Đọc header và footer nếu có
    let headerXml = '';
    let footerXml = '';
    const headerFiles = zip.file(/^word\/header\d+\.xml$/);
    const footerFiles = zip.file(/^word\/footer\d+\.xml$/);

    if (headerFiles && headerFiles.length > 0) {
      for (const headerFile of headerFiles) {
        headerXml += await headerFile.async('string') + '\n';
      }
    }

    if (footerFiles && footerFiles.length > 0) {
      for (const footerFile of footerFiles) {
        footerXml += await footerFile.async('string') + '\n';
      }
    }

    // Extract text với format tốt nhất để giữ ký hiệu toán học
    const docText = extractTextFromXmlAdvanced(documentXml);
    const headerText = headerXml ? extractTextFromXmlAdvanced(headerXml) : '';
    const footerText = footerXml ? extractTextFromXmlAdvanced(footerXml) : '';

    return [docText, headerText, footerText].filter(t => t).join('\n\n');
  } else if (ext === 'xlsx' || ext === 'xls') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Convert Excel data to readable text
    let text = '';
    jsonData.forEach((row, index) => {
      if (Array.isArray(row)) {
        const rowText = row.filter(cell => cell !== '' && cell !== null).join(' | ');
        if (rowText) {
          text += `Row ${index + 1}: ${rowText}\n`;
        }
      }
    });
    return text;
  }

  return '';
}

/**
 * Extract text từ XML - Tối ưu để giữ TOÀN VẸN ký hiệu toán học
 * Giữ nguyên thứ tự, format, và tất cả ký hiệu đặc biệt
 */
function extractTextFromXmlAdvanced(xml) {
  if (!xml) return '';

  let result = '';

  // Tìm tất cả các phần tử quan trọng theo thứ tự xuất hiện
  const allElements = [];

  // Tìm tất cả w:t (text runs) và m:oMath (math blocks) theo thứ tự
  const textPattern = /<w:t[^>]*>([\s\S]*?)<\/w:t>/gi;
  const mathPattern = /<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/gi;
  const breakPattern = /<w:br\s*\/?>/gi;
  const paraPattern = /<w:p[^>]*>/gi;
  const paraEndPattern = /<\/w:p>/gi;

  // Collect tất cả elements với vị trí
  let match;

  // Text runs
  while ((match = textPattern.exec(xml)) !== null) {
    allElements.push({
      type: 'text',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    });
  }

  // Math blocks
  while ((match = mathPattern.exec(xml)) !== null) {
    allElements.push({
      type: 'math',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    });
  }

  // Paragraph breaks
  while ((match = paraPattern.exec(xml)) !== null) {
    allElements.push({
      type: 'para_start',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  while ((match = paraEndPattern.exec(xml)) !== null) {
    allElements.push({
      type: 'para_end',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Line breaks
  while ((match = breakPattern.exec(xml)) !== null) {
    allElements.push({
      type: 'break',
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Sắp xếp theo vị trí
  allElements.sort((a, b) => a.start - b.start);

  // Build result theo thứ tự
  for (const elem of allElements) {
    if (elem.type === 'text') {
      // Decode XML entities trong text
      let content = decodeXmlEntities(elem.content);
      result += content;
    } else if (elem.type === 'math') {
      // Extract math content từ OMath - giữ nguyên tất cả ký hiệu
      const mathContent = extractMathContent(elem.content);
      result += mathContent;
    } else if (elem.type === 'para_start' && result && !result.endsWith('\n')) {
      result += '\n';
    } else if (elem.type === 'para_end' && result && !result.endsWith('\n')) {
      result += '\n';
    } else if (elem.type === 'break') {
      result += '\n';
    }
    // Track position (unused but kept for future reference)
    // lastPos = elem.end;
  }

  // Nếu không extract được gì, dùng fallback
  if (!result || result.trim().length === 0) {
    result = extractTextFromXmlFallback(xml);
  }

  // Cleanup nhưng giữ ký hiệu toán học
  return result
    .replace(/[ \t]{2,}/g, ' ') // Nhiều spaces thành 1 space
    .replace(/\n{3,}/g, '\n\n') // Nhiều newlines thành 2
    .trim();
}

/**
 * Extract math content từ OMath XML - giữ nguyên tất cả ký hiệu
 */
function extractMathContent(mathXml) {
  let result = '';

  // Extract từ m:t (math text) - giữ nguyên
  const mathTexts = mathXml.match(/<m:t[^>]*>([\s\S]*?)<\/m:t>/gi);
  if (mathTexts) {
    result = mathTexts.map(mt => {
      const content = mt.replace(/<m:t[^>]*>|<\/m:t>/gi, '');
      return decodeXmlEntities(content);
    }).join('');
  }

  // Extract từ m:r (math runs) nếu không có m:t
  if (!result) {
    const mathRuns = mathXml.match(/<m:r[^>]*>([\s\S]*?)<\/m:r>/gi);
    if (mathRuns) {
      result = mathRuns.map(mr => {
        // Tìm m:t trong m:r
        const textMatch = mr.match(/<m:t[^>]*>([\s\S]*?)<\/m:t>/);
        if (textMatch) {
          return decodeXmlEntities(textMatch[1]);
        }
        return '';
      }).join('');
    }
  }

  // Nếu vẫn không có, extract tất cả text nodes
  if (!result) {
    result = mathXml
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    result = decodeXmlEntities(result);
  }

  return result;
}

/**
 * Decode XML entities - giữ nguyên tất cả ký hiệu đặc biệt
 */
function decodeXmlEntities(text) {
  if (!text) return '';

  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (match, dec) => {
      const code = parseInt(dec, 10);
      // Giữ nguyên tất cả Unicode characters (ký hiệu toán học)
      return String.fromCharCode(code);
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const code = parseInt(hex, 16);
      // Giữ nguyên tất cả Unicode characters (ký hiệu toán học)
      return String.fromCharCode(code);
    });
}

/**
 * Ước tính số câu hỏi trong file (để validation)
 * @param {Object} fileData - File data object {fileName, mimeType, data}
 * @returns {number} - Số câu hỏi ước tính
 */
function _estimateQuestionCount(fileData) {
  // Nếu là text/plain (đã extract từ DOCX), đếm pattern "Câu"
  if (fileData.mimeType === 'text/plain') {
    try {
      const text = atob(fileData.data);
      // Đếm pattern "Câu 1:", "Câu 2:", "PHẦN I", "PHẦN II", etc.
      const questionPatterns = [
        /Câu\s+\d+[:.]\\s/gi,
        /PHẦN\s+[IVX]+/gi,
        /Câu\s+\d+[.)]\\s/gi
      ];

      let maxCount = 0;
      for (const pattern of questionPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > maxCount) {
          maxCount = matches.length;
        }
      }

      // Nếu tìm thấy pattern "PHẦN", đếm số câu trong mỗi phần
      const partMatches = text.match(/PHẦN\s+[IVX]+[^PHẦN]*/gi);
      if (partMatches) {
        let totalQuestions = 0;
        for (const part of partMatches) {
          const questionMatches = part.match(/Câu\s+\d+[:.)]\s/gi);
          if (questionMatches) {
            totalQuestions += questionMatches.length;
          }
        }
        if (totalQuestions > 0) {
          return totalQuestions;
        }
      }

      return maxCount || 0;
    } catch (error) {
      console.warn('[AIFileProcessor] Không thể ước tính số câu hỏi:', error);
      return 0;
    }
  }

  // Với PDF/Images, không thể ước tính chính xác, return 0 (sẽ không validate)
  return 0;
}

/**
 * Fallback extraction nếu cách chính thất bại
 */
function extractTextFromXmlFallback(xml) {
  return xml
    .replace(/<w:br\s*\/?>/gi, '\n')
    .replace(/<w:p[^>]*>/gi, '\n')
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<w:t[^>]*>/gi, '')
    .replace(/<\/w:t>/gi, '')
    .replace(/<m:oMath[^>]*>/gi, '')
    .replace(/<\/m:oMath>/gi, '')
    .replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Nhận diện loại file bằng AI (Bước 1)
 * @param {File[]} files - Danh sách file cần nhận diện
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - Map fileName -> {type, confidence}
 */
export async function identifyFileTypesWithAI(files, apiKey) {
  if (!files || files.length === 0) {
    return {};
  }

  if (!apiKey) {
    throw new Error('API Key không được để trống');
  }

  // Extract text từ tất cả file (chỉ lấy phần đầu để nhận diện)
  const fileContents = [];
  for (const file of files) {
    try {
      const text = await extractFileText(file);
      // Chỉ lấy 5000 ký tự đầu để nhận diện (nhanh hơn, rẻ hơn)
      fileContents.push({
        fileName: file.name,
        content: text.substring(0, 5000)
      });
    } catch (error) {
      console.error(`Error extracting text from ${file.name}:`, error);
      fileContents.push({
        fileName: file.name,
        content: ''
      });
    }
  }

  const prompt = `Bạn là một hệ thống AI chuyên nhận diện loại file đề thi, đáp án và danh sách học sinh.

NHIỆM VỤ: Nhận diện loại file dựa trên nội dung.

DANH SÁCH FILE:
${fileContents.map((f, i) => `
=== FILE ${i + 1}: ${f.fileName} ===
${f.content}
`).join('\n')}

YÊU CẦU OUTPUT (JSON format):
{
  "fileTypes": {
    "${fileContents[0]?.fileName || 'file1'}": {
      "type": "exam_paper|answer_sheet|essay_answer|student_list",
      "confidence": 0.0-1.0
    }
  }
}

LOẠI FILE:
- exam_paper: Đề thi (có "PHẦN I", "Câu trắc nghiệm", "Mã đề", "Thời gian làm bài")
- answer_sheet: Đáp án trắc nghiệm/đúng sai/trả lời ngắn (Excel có "Câu\\Mã Đề", có A/B/C/D hoặc S/Đ)
- essay_answer: Đáp án tự luận (có "PHẦN TỰ LUẬN", "LỜI GIẢI", "ĐIỂM")
- student_list: Danh sách học sinh (Excel có "Mã học sinh", "Họ và tên", "Ngày sinh")

Trả về CHỈ JSON object, không có markdown, không có text thừa.`;

  const result = await callGeminiAPI(prompt, apiKey);
  return result.fileTypes || {};
}

/**
 * Parse file và tạo câu hỏi bằng AI (Bước 2) - Hỗ trợ mã đề
 * @param {File[]} files - Danh sách file cần parse
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Array>} - Danh sách câu hỏi đã parse, có thể có nhiều mã đề
 */
// Helper: Convert file to base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper: Get MIME type from file
function getMimeType(fileName, fileType = null) {
  // Ưu tiên dùng file.type từ File object (chính xác hơn)
  if (fileType && fileType.startsWith('image/')) {
    return fileType;
  }

  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  return mimeTypes[ext] || fileType || 'application/octet-stream';
}

export async function parseQuestionsWithAI(files, apiKey) {
  if (!files || files.length === 0) {
    return [];
  }

  if (!apiKey) {
    throw new Error('API Key không được để trống');
  }

  // Xử lý files: DOCX/XLSX extract text, PDF/Images/TXT gửi thẳng
  const fileData = [];
  for (const file of files) {
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      // Dùng file.type từ File object (chính xác hơn) hoặc getMimeType
      const mimeType = getMimeType(file.name, file.type);

      // Gemini API không hỗ trợ DOCX/XLSX trực tiếp, cần extract text
      if (ext === 'docx' || ext === 'doc' || ext === 'xlsx' || ext === 'xls') {
        const text = await extractFileText(file);
        // Convert text to base64 với UTF-8 encoding để giữ ký hiệu đặc biệt
        const utf8Bytes = new TextEncoder().encode(text);
        const base64 = btoa(String.fromCharCode(...utf8Bytes));

        fileData.push({
          fileName: file.name,
          mimeType: 'text/plain', // Bỏ charset (Gemini API không cần)
          data: base64
        });
      } else if (ext === 'pdf') {
        // PDF: Gửi thẳng file (Gemini hỗ trợ PDF tốt, giữ nguyên format và ký hiệu toán học)
        const base64 = await fileToBase64(file);
        fileData.push({
          fileName: file.name,
          mimeType: 'application/pdf',
          data: base64
        });
      } else {
        // Images, TXT: Gửi thẳng file
        const base64 = await fileToBase64(file);
        fileData.push({
          fileName: file.name,
          mimeType: mimeType,
          data: base64
        });
      }
    } catch (error) {
      console.error(`[AIFileProcessor] Error reading file ${file.name}:`, error);
      throw new Error(`Không thể đọc file ${file.name}: ${error.message}`);
    }
  }

  // Files processed (log đã được tối ưu)

  // BƯỚC 1: Xác định loại file và mã đề (gửi thẳng file)
  const prompt1 = `Bạn là một hệ thống AI chuyên phân tích file đề thi và đáp án.

NHIỆM VỤ BƯỚC 1: Xác định loại file và mã đề (nếu có) từ các file đã upload.

YÊU CẦU OUTPUT (JSON format):
{
  "files": [
    {
      "fileName": "tên file",
      "type": "exam_paper|answer_sheet|essay_answer",
      "examCode": "mã đề (ví dụ: 101, 103, null nếu không có)",
      "examCodes": ["101", "103", "105"] (nếu là answer_sheet có nhiều mã đề)
    }
  ]
}

QUY TẮC:
1. exam_paper: File đề thi (có "PHẦN I", "Câu trắc nghiệm", "Mã đề")
   - Tìm "Mã đề" trong file, extract số (ví dụ: "Mã đề 101" → "101")
   - examCode là mã đề duy nhất của file này
   - Xác định loại mã đề: "even" (chẵn: 102, 104, 106...) hoặc "odd" (lẻ: 101, 103, 105...)
   - Thêm field "examCodeType": "even" | "odd" | null

2. answer_sheet: File đáp án trắc nghiệm/đúng sai/trả lời ngắn (Excel có "Câu\\Mã Đề")
   - Tìm dòng header có "Câu\\Mã Đề | 101 | 103 | 105 | 107"
   - examCodes là mảng tất cả mã đề trong header
   - Xác định loại: "even" nếu tất cả mã đề chẵn, "odd" nếu tất cả mã đề lẻ, "mixed" nếu có cả hai

3. essay_answer: File đáp án tự luận (có "PHẦN TỰ LUẬN", "LỜI GIẢI")
   - Tìm "Mã đề lẻ" hoặc "Mã đề chẵn" trong file
   - examCodeType: "even" nếu có "Mã đề chẵn", "odd" nếu có "Mã đề lẻ", null nếu không rõ
   - examCode = null (không có mã đề cụ thể)

Trả về CHỈ JSON object, không có markdown, không có text thừa.`;

  const result1 = await callGeminiAPIWithFiles(prompt1, fileData, apiKey);
  const fileTypes = result1.files || [];

  // Tìm file đề thi và mã đề
  const examPaperFile = fileTypes.find(f => f.type === 'exam_paper');
  const examCode = examPaperFile?.examCode || null;

  // Tìm file đáp án trắc nghiệm
  const answerSheetFile = fileTypes.find(f => f.type === 'answer_sheet');
  const answerSheetCodes = answerSheetFile?.examCodes || [];

  // Tìm file đáp án tự luận
  const essayAnswerFile = fileTypes.find(f => f.type === 'essay_answer');

  // Tìm TẤT CẢ file đề thi (có thể là nhiều ảnh = 1 đề thi)
  // Lọc tất cả file không phải answer_sheet hoặc essay_answer
  const examPaperFilesData = fileData.filter(f => {
    const fileType = fileTypes.find(ft => ft.fileName === f.fileName);
    // Nếu có fileType và là exam_paper → dùng
    if (fileType && fileType.type === 'exam_paper') {
      return true;
    }
    // Nếu không có fileType hoặc không phải answer_sheet/essay_answer → coi là đề thi
    return !fileType || (fileType.type !== 'answer_sheet' && fileType.type !== 'essay_answer');
  });

  // Nếu không tìm thấy file nào
  if (examPaperFilesData.length === 0) {
    throw new Error('Không tìm thấy file đề thi. Vui lòng upload file đề thi.');
  }

  console.log(`[AIFileProcessor] 📄 Parse ${examPaperFilesData.length} ảnh đề thi (${(examPaperFilesData.reduce((sum, f) => sum + (f.data?.length || 0), 0) / 1024 / 1024).toFixed(2)}MB)`);

  const prompt2 = `Bạn là một hệ thống AI chuyên phân tích file đề thi.

NHIỆM VỤ BƯỚC 2: Parse file đề thi và extract CHÍNH XÁC TẤT CẢ câu hỏi từ đề thi gốc.

⚠️ YÊU CẦU NGHIÊM NGẶT:
1. PHẢI parse TẤT CẢ 4 PHẦN: PHẦN I, PHẦN II, PHẦN III, PHẦN IV
2. PHẢI parse TẤT CẢ câu hỏi trong mỗi phần, KHÔNG được bỏ sót
3. Đếm số câu trong mỗi phần TRƯỚC KHI parse
4. questionNumber PHẢI được gán đúng theo thứ tự trong từng phần (1, 2, 3...)
5. TUYỆT ĐỐI KHÔNG tự tạo thêm câu hỏi, KHÔNG bỏ sót câu hỏi nào
6. ⚠️ QUAN TRỌNG VỀ KÝ HIỆU TOÁN HỌC:
   - PHẢI giữ nguyên TẤT CẢ ký hiệu toán học trong content
   - Sử dụng LaTeX format: $...$ cho inline math, $$...$$ cho block math
   - Ví dụ: $(x;y) = (9;8)$ → giữ nguyên "$(x;y) = (9;8)$"
   - Ví dụ: $\\sin \\alpha = \\frac{3}{5}$ → giữ nguyên "$\\sin \\alpha = \\frac{3}{5}$"
   - Ví dụ: $A = \\{n^2 | n \\in N; n \\le 5\\}$ → giữ nguyên "$A = \\{n^2 | n \\in N; n \\le 5\\}$"
   - KHÔNG được chuyển đổi ký hiệu toán học sang text thường
   - KHÔNG được bỏ sót bất kỳ ký hiệu nào: $, \\, {, }, ^, _, \\in, \\le, \\ge, \\sin, \\cos, \\frac, etc.

YÊU CẦU OUTPUT (JSON format):
{
  "questions": [
    {
      "part": "I|II|III|IV",
      "partName": "PHẦN I|PHẦN II|PHẦN III|PHẦN IV",
      "questionNumber": 1,  // ⚠️ BẮT BUỘC: số thứ tự câu trong phần (1, 2, 3...)
      "type": "multiple_choice|true_false|short_answer|essay",
      "content": "Nội dung câu hỏi đầy đủ (bao gồm tất cả các ý a, b, c, d nếu là câu đúng/sai)",
      "content": "Nội dung câu hỏi đầy đủ (bao gồm tất cả các ý a, b, c, d nếu là câu đúng/sai)",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (chỉ có khi type là multiple_choice),
      "subQuestions": ["a) ...", "b) ...", "c) ...", "d) ..."] (chỉ có khi type là true_false, giữ nguyên tất cả các ý),
      "subject": "Môn học (ví dụ: Toán)",
      "difficulty": "easy|medium|hard"
    }
  ],
  "examCode": "${examCode || 'null'}",
  "summary": {
    "PHẦN I": "số câu",
    "PHẦN II": "số câu",
    "PHẦN III": "số câu",
    "PHẦN IV": "số câu",
    "total": "tổng số câu"
  }
}

⚠️ QUAN TRỌNG VỀ OUTPUT JSON:
1. Viết LaTeX BÌNH THƯỜNG với dấu backslash đơn: \\frac, \\setminus, \\{, \\in, \\alpha
2. KHÔNG CẦN double escape - hệ thống sẽ tự xử lý
3. Ví dụ ĐÚNG: "$A \\setminus B$", "$\\{1, 2, 3\\}$", "$\\frac{1}{2}$"
4. Đảm bảo JSON hợp lệ, đóng đủ dấu ngoặc

QUY TẮC NGHIÊM NGẶT CHO TỪNG PHẦN:

1. PHẦN I: Trắc nghiệm nhiều phương án (multiple_choice)
   - part: "I", partName: "PHẦN I"
   - Tìm tất cả câu có format "Câu 1:", "Câu 2:", ... "Câu 12:"
   - Mỗi câu có 4 đáp án A, B, C, D
   - questionNumber: 1, 2, 3, ... (theo thứ tự trong đề)
   - MỖI CÂU = 1 CÂU HỎI
   - ⚠️ PHẢI parse TẤT CẢ câu từ 1 đến hết (thường là 12 câu)

2. PHẦN II: Trắc nghiệm đúng sai (true_false)
   - part: "II", partName: "PHẦN II"
   - Tìm tất cả câu có format "Câu 1.", "Câu 2.", "Câu 3.", "Câu 4." (reset về 1 trong phần này)
   - ⚠️ MỖI CÂU có ĐÚNG 4 ý: a), b), c), d) - KHÔNG ĐƯỢC BỎ SÓT ý nào!
   - QUAN TRỌNG: KHÔNG TÁCH thành nhiều câu hỏi riêng
   - MỖI CÂU = 1 CÂU HỎI (giữ nguyên tất cả các ý a, b, c, d trong content)
   - questionNumber: 1, 2, 3, 4 (reset về 1 trong phần này)
   - ⚠️ CRITICAL: subQuestions PHẢI chứa CHÍNH XÁC 4 phần tử ["a) ...", "b) ...", "c) ...", "d) ..."]
   - ⚠️ Copy CHÍNH XÁC nội dung từng ý từ đề gốc, KHÔNG được viết lại hay đổi số liệu
   - Ví dụ câu đúng sai về tập hợp:
     * content: "Cho hai tập hợp $A = \\{-3, -1, 0, 2, 5\\}, B = \\{-1, 0, 4, 5\\}$. Khi đó:"
     * subQuestions: [
         "a) $A \\cup B = \\{-3, -1, 0, 2, 5\\}$",
         "b) $A \\cap B = \\{-1, 0, 5\\}$",
         "c) $B \\setminus A = \\{5, 2\\}$",
         "d) $A \\setminus B = \\{-3, 2\\}$"
       ]
   - Ví dụ câu đúng sai về hệ bất phương trình (có nhiều dòng):
     * content: "Cho hệ bất phương trình:\\n$\\\\begin{cases} -x + 2y \\\\ge 0 \\\\\\\\ 2x - y \\\\ge 0 \\\\\\\\ x + y - 3 \\\\le 0 \\\\end{cases}$\\nCác mệnh đề sau đúng hay sai?"
     * subQuestions: [
         "a) Điểm $(1; 1)$ thuộc miền nghiệm của hệ bất phương trình đã cho.",
         "b) Điểm $(3; 2)$ thuộc miền nghiệm của hệ bất phương trình đã cho.",
         "c) Miền nghiệm là miền tam giác.",
         "d) Hệ bất phương trình đã cho là hệ bất phương trình bậc nhất hai ẩn."
       ]
   - content: toàn bộ câu hỏi bao gồm tất cả các ý
   - ⚠️ PHẢI parse TẤT CẢ câu trong phần này (thường là 3-4 câu)

3. PHẦN III: Trả lời ngắn (short_answer)
   - part: "III", partName: "PHẦN III"
   - Tìm tất cả câu có format "Câu 1:", "Câu 2:", ... (reset về 1 trong phần này)
   - questionNumber: 1, 2, ... (reset về 1 trong phần này)
   - MỖI CÂU = 1 CÂU HỎI
   - ⚠️ PHẢI parse TẤT CẢ câu trong phần này (thường là 2 câu)

4. PHẦN IV: Tự luận (essay)
   - part: "IV", partName: "PHẦN IV"
   - Tìm tất cả câu có format "Câu 1:", "Câu 2:", "Câu 3:", ... (reset về 1 trong phần này)
   - questionNumber: 1, 2, 3, ... (reset về 1 trong phần này)
   - content: toàn bộ câu hỏi tự luận (bao gồm cả sub-questions a), b) nếu có)
   - MỖI CÂU = 1 CÂU HỎI
   - ⚠️ PHẢI parse TẤT CẢ câu tự luận (thường là 2-3 câu)
   - ⚠️ QUAN TRỌNG: KHÔNG được bỏ sót PHẦN IV

QUY TRÌNH PARSE:
1. Đọc toàn bộ file đề thi
2. Xác định các phần: PHẦN I, PHẦN II, PHẦN III, PHẦN IV
3. Với mỗi phần:
   a. Đếm số câu hỏi trong phần đó
   b. Parse từng câu hỏi theo thứ tự
   c. Gán questionNumber đúng (1, 2, 3... trong phần đó)
4. Tổng hợp tất cả câu hỏi vào mảng questions
5. Tạo summary với số câu mỗi phần

VALIDATION:
- Tổng số câu hỏi phải >= 15 (thường là 21 câu: 12 + 4 + 2 + 3)
- PHẢI có đủ 4 phần
- Mỗi phần phải có ít nhất 1 câu hỏi
- questionNumber phải được gán đúng (không được undefined)

Trả về CHỈ JSON object, không có markdown, không có text thừa.

⚠️ QUAN TRỌNG: Bạn đang nhận được ${examPaperFilesData.length} file ảnh. TẤT CẢ đều là MỘT đề thi duy nhất (đề thi dài nên chia thành nhiều ảnh).
- File 1: Trang 1 của đề thi
- File 2: Trang 2 của đề thi
- ...
- File ${examPaperFilesData.length}: Trang cuối của đề thi

PHẢI parse TẤT CẢ các phần và câu hỏi từ TẤT CẢ các file này, không được bỏ sót!`;

  const result2 = await callGeminiAPIWithFiles(prompt2, examPaperFilesData, apiKey);
  let questions = result2.questions || [];
  const summary = result2.summary || {};

  // VALIDATION CHẶT CHẼ
  const actualCount = questions.length;
  const expectedMin = 15; // Tối thiểu 15 câu (thường là 21: 12+4+2+3)

  // Kiểm tra số câu hỏi
  let validationErrors = [];
  let validationWarnings = [];

  if (actualCount < expectedMin) {
    validationErrors.push(`❌ SAI NGHIÊM TRỌNG: Chỉ parse được ${actualCount} câu, nhưng đề thi thường có >= ${expectedMin} câu. Có thể đã bỏ sót nhiều câu hỏi!`);
  }

  // Kiểm tra có đủ 4 phần không
  const partsFound = new Set(questions.map(q => q.part || q.partName));
  const expectedParts = ['I', 'II', 'III', 'IV'];
  const missingParts = expectedParts.filter(p => {
    return !Array.from(partsFound).some(found =>
      found === p || found === `PHẦN ${p}` || found?.includes(p)
    );
  });

  if (missingParts.length > 0) {
    validationErrors.push(`❌ THIẾU PHẦN: Không tìm thấy ${missingParts.map(p => `PHẦN ${p}`).join(', ')}. Đề thi phải có đủ 4 phần!`);
  }

  // Kiểm tra questionNumber
  const questionsWithoutNumber = questions.filter(q => !q.questionNumber && !q.number);
  if (questionsWithoutNumber.length > 0) {
    validationErrors.push(`❌ THIẾU questionNumber: ${questionsWithoutNumber.length} câu hỏi không có questionNumber!`);
  }

  // ⚠️ QUAN TRỌNG: Kiểm tra questionNumber reset về 1 trong mỗi phần
  const partGroups = {};
  questions.forEach(q => {
    const part = q.part || q.partName || 'I';
    if (!partGroups[part]) {
      partGroups[part] = [];
    }
    partGroups[part].push(q);
  });

  // Kiểm tra mỗi phần phải có questionNumber bắt đầu từ 1
  for (const [part, partQuestions] of Object.entries(partGroups)) {
    const sortedQuestions = partQuestions.sort((a, b) => {
      const aNum = a.questionNumber || a.number || 0;
      const bNum = b.questionNumber || b.number || 0;
      return aNum - bNum;
    });

    // Kiểm tra câu đầu tiên phải là 1
    const firstQuestionNumber = sortedQuestions[0]?.questionNumber || sortedQuestions[0]?.number;
    if (firstQuestionNumber !== 1 && firstQuestionNumber !== undefined) {
      validationWarnings.push(`⚠️ ${part}: Câu đầu tiên phải là Câu 1, nhưng tìm thấy Câu ${firstQuestionNumber}. Có thể AI parse sai thứ tự!`);
    }

    // Kiểm tra questionNumber phải liên tục (1, 2, 3...)
    for (let i = 0; i < sortedQuestions.length; i++) {
      const expectedNum = i + 1;
      const actualNum = sortedQuestions[i].questionNumber || sortedQuestions[i].number;
      if (actualNum !== expectedNum && actualNum !== undefined) {
        validationWarnings.push(`⚠️ ${part}: Câu thứ ${i + 1} có questionNumber=${actualNum}, nhưng mong đợi ${expectedNum}. Có thể AI parse sai thứ tự!`);
        break; // Chỉ cảnh báo lần đầu
      }
    }
  }

  // Kiểm tra summary
  if (summary && Object.keys(summary).length > 0) {
    console.log(`[AIFileProcessor] Summary từ AI:`, summary);
    const summaryTotal = summary.total || summary.TOTAL || 0;
    if (summaryTotal > 0 && summaryTotal !== actualCount) {
      validationWarnings.push(`⚠️ Summary từ AI (${summaryTotal}) khác với số câu thực tế (${actualCount})`);
    }
  }

  // Log validation results
  if (validationErrors.length > 0) {
    console.error(`[AIFileProcessor] ❌ VALIDATION ERRORS:`, validationErrors);
    questions._validationErrors = validationErrors;
  }
  if (validationWarnings.length > 0) {
    console.warn(`[AIFileProcessor] ⚠️ VALIDATION WARNINGS:`, validationWarnings);
    questions._validationWarnings = validationWarnings;
  }

  // Log số câu theo phần
  const questionsByPart = {};
  questions.forEach(q => {
    const part = q.part || q.partName || 'UNKNOWN';
    if (!questionsByPart[part]) {
      questionsByPart[part] = [];
    }
    questionsByPart[part].push(q);
  });

  console.log(`[AIFileProcessor] 📊 Số câu hỏi theo phần:`,
    Object.keys(questionsByPart).map(part =>
      `${part}: ${questionsByPart[part].length} câu`
    ).join(', ')
  );

  // ⚠️ QUAN TRỌNG: Đảm bảo questionNumber được reset về 1 trong mỗi phần
  // Nếu AI parse sai (ví dụ: PHẦN II bắt đầu từ Câu 13), tự động fix
  const fixedQuestions = [];
  for (const part of Object.keys(questionsByPart)) {
    const partQuestions = questionsByPart[part];
    // Sort theo questionNumber hiện tại (nếu có) hoặc theo thứ tự trong mảng
    const sorted = [...partQuestions].sort((a, b) => {
      const aNum = a.questionNumber || a.number || 0;
      const bNum = b.questionNumber || b.number || 0;
      if (aNum !== 0 && bNum !== 0) {
        return aNum - bNum;
      }
      // Nếu không có questionNumber, giữ nguyên thứ tự
      return 0;
    });

    // Reset questionNumber về 1, 2, 3... trong mỗi phần
    sorted.forEach((q, index) => {
      const oldNumber = q.questionNumber || q.number;
      const newNumber = index + 1;

      // ⚠️ QUAN TRỌNG: Luôn tạo object mới với questionNumber được gán đúng
      const fixedQuestion = {
        ...q,
        questionNumber: newNumber // Luôn gán lại để đảm bảo đúng
      };

      // Log để debug
      if (oldNumber !== newNumber && oldNumber !== undefined) {
        console.warn(`[AIFileProcessor] ⚠️ Fix questionNumber: ${part} - Câu ${oldNumber} → Câu ${newNumber}`);
      } else if (!q.questionNumber) {
        console.log(`[AIFileProcessor] ✅ Gán questionNumber=${newNumber} cho ${part} - Câu ${index + 1}`);
      }

      fixedQuestions.push(fixedQuestion);
    });
  }

  questions = fixedQuestions;

  // Log để verify
  console.log(`[AIFileProcessor] ✅ Đã fix questionNumber cho ${questions.length} câu hỏi`);
  questions.slice(0, 5).forEach((q, i) => {
    console.log(`[AIFileProcessor] Question ${i}: ${q.partName || `PHẦN ${q.part}`} - Câu ${q.questionNumber}`);
  });

  if (actualCount >= expectedMin && missingParts.length === 0 && questionsWithoutNumber.length === 0) {
    console.log(`[AIFileProcessor] ✅ VALIDATION PASSED: ${actualCount} câu hỏi, đủ 4 phần, tất cả có questionNumber`);
  }

  // BƯỚC 3: Parse đáp án trắc nghiệm và match theo mã đề (gửi thẳng file đáp án)
  if (answerSheetFile && examCode && answerSheetCodes.includes(examCode)) {
    const answerSheetFileData = fileData.find(f =>
      fileTypes.find(ft => ft.fileName === f.fileName && ft.type === 'answer_sheet')
    );

    if (answerSheetFileData) {
      const prompt3 = `Bạn là một hệ thống AI chuyên phân tích file đáp án trắc nghiệm.

NHIỆM VỤ BƯỚC 3: Parse file đáp án trắc nghiệm và match với câu hỏi theo mã đề ${examCode}.

DANH SÁCH CÂU HỎI CẦN MATCH:
${JSON.stringify(questions, null, 2)}

YÊU CẦU OUTPUT (JSON format):
{
  "answers": [
    {
      "part": "I|II|III",
      "questionNumber": 1,
      "correctAnswer": "A|B|C|D|SĐSĐ|giá trị số" (tùy loại câu)
    }
  ]
}

QUY TẮC:
1. Tìm dòng header: "Câu\\Mã Đề | 101 | 103 | 105 | 107"
2. Xác định cột tương ứng với mã đề ${examCode}
3. Match đáp án với câu hỏi:
   - PHẦN I (trắc nghiệm): Đáp án là A/B/C/D
   - PHẦN II (đúng/sai): Đáp án là "SĐSĐ" → GIỮ NGUYÊN chuỗi "SĐSĐ" (không tách)
     * Câu 1 → "SĐSĐ" (đáp án cho cả 4 ý a, b, c, d)
   - PHẦN III (trả lời ngắn): Đáp án là giá trị (ví dụ: "-0,8.", "21.")

QUAN TRỌNG:
- Chỉ lấy đáp án của mã đề ${examCode}
- Match chính xác với part và questionNumber
- Với câu đúng/sai: GIỮ NGUYÊN chuỗi đáp án "SĐSĐ", không tách thành nhiều câu
- Số lượng answers PHẢI BẰNG số lượng questions (1 câu hỏi = 1 đáp án)

Trả về CHỈ JSON object, không có markdown, không có text thừa.`;

      const result3 = await callGeminiAPIWithFiles(prompt3, [answerSheetFileData], apiKey, questions);
      const answers = result3.answers || [];

      // Merge đáp án vào câu hỏi (match theo part và questionNumber)
      questions = questions.map(q => {
        const answer = answers.find(a =>
          a.part === q.part &&
          a.questionNumber === q.questionNumber
        );

        // Với câu đúng/sai, đáp án là chuỗi "SĐSĐ", giữ nguyên
        return {
          ...q,
          correctAnswer: answer?.correctAnswer || q.correctAnswer || ''
        };
      });
    }
  }

  // BƯỚC 4: Parse đáp án tự luận và apply chung (gửi thẳng file đáp án)
  if (essayAnswerFile) {
    const essayAnswerFileData = fileData.find(f =>
      fileTypes.find(ft => ft.fileName === f.fileName && ft.type === 'essay_answer')
    );

    // Lọc chỉ câu tự luận
    const essayQuestions = questions.filter(q => q.type === 'essay');

    if (essayQuestions.length > 0 && essayAnswerFileData) {
      const prompt4 = `Bạn là một hệ thống AI chuyên phân tích file đáp án tự luận.

NHIỆM VỤ BƯỚC 4: Parse file đáp án tự luận và match với câu hỏi.

DANH SÁCH CÂU HỎI TỰ LUẬN CẦN MATCH:
${JSON.stringify(essayQuestions, null, 2)}

YÊU CẦU OUTPUT (JSON format):
{
  "answers": [
    {
      "part": "IV",
      "questionNumber": 1,
      "correctAnswer": "Đáp án mẫu đầy đủ với lời giải chi tiết"
    }
  ]
}

QUY TẮC:
1. Tìm phần "Mã đề lẻ" hoặc "Mã đề chẵn" (đáp án giống nhau)
2. Match câu hỏi tự luận với đáp án theo part và questionNumber
3. correctAnswer là đáp án mẫu đầy đủ từ file (bao gồm cả lời giải)

QUAN TRỌNG:
- Đáp án tự luận apply chung cho TẤT CẢ mã đề
- Match chính xác theo part và questionNumber
- Giữ nguyên format đáp án từ file

Trả về CHỈ JSON object, không có markdown, không có text thừa.`;

      const result4 = await callGeminiAPIWithFiles(prompt4, [essayAnswerFileData], apiKey, essayQuestions);
      const essayAnswers = result4.answers || [];

      // Merge đáp án tự luận vào câu hỏi
      questions = questions.map(q => {
        if (q.type === 'essay') {
          const answer = essayAnswers.find(a =>
            a.part === q.part && a.questionNumber === q.questionNumber
          );
          return {
            ...q,
            correctAnswer: answer?.correctAnswer || q.correctAnswer || ''
          };
        }
        return q;
      });
    }
  }

  // Giữ lại part, partName và questionNumber để hiển thị chia phần
  const result = questions.map(({ part, partName, questionNumber, ...rest }) => ({
    ...rest,
    part: part || undefined, // Giữ lại part (I, II, III, IV)
    partName: partName || undefined, // Giữ lại partName (PHẦN I, PHẦN II, etc.)
    questionNumber: questionNumber || undefined, // ⚠️ QUAN TRỌNG: Giữ lại questionNumber
    examCode: examCode || undefined // Thêm mã đề vào mỗi câu hỏi (nếu có)
  }));

  // Thêm validation warning nếu có
  if (questions._validationWarning) {
    result._validationWarning = questions._validationWarning;
  }

  return result;
}

/**
 * Parse file danh sách học sinh bằng AI (Bước 2)
 * @param {File} file - File Excel danh sách học sinh
 * @param {string} className - Tên lớp
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Array>} - Danh sách học sinh đã parse
 */
export async function parseStudentListWithAI(file, className, apiKey) {
  if (!file || !apiKey) {
    throw new Error('File và API Key không được để trống');
  }

  // Extract text từ Excel
  const text = await extractFileText(file);

  const prompt = `Bạn là một hệ thống AI chuyên phân tích file danh sách học sinh.

NHIỆM VỤ: Phân tích file Excel danh sách học sinh và extract thông tin học sinh.

NỘI DUNG FILE:
${text.substring(0, 10000)}

YÊU CẦU OUTPUT (JSON format):
{
  "students": [
    {
      "studentId": "Mã học sinh (nếu có)",
      "fullName": "Họ và tên đầy đủ",
      "dateOfBirth": "Ngày sinh (nếu có, format: DD/MM/YYYY)"
    }
  ]
}

QUY TẮC PARSE:
1. Tìm hàng header (có "Mã học sinh", "Họ và tên", "Họ tên", "STT")
2. Extract thông tin từ các hàng dữ liệu:
   - Mã học sinh (nếu có)
   - Họ và tên đầy đủ (bắt buộc)
   - Ngày sinh (nếu có)
3. Bỏ qua các hàng trống hoặc không có tên
4. Chuẩn hóa format:
   - fullName: Viết hoa chữ cái đầu mỗi từ
   - dateOfBirth: Format DD/MM/YYYY hoặc để trống nếu không có

QUAN TRỌNG:
- Phải extract ĐẦY ĐỦ tất cả học sinh có trong file
- fullName là bắt buộc, nếu không có thì bỏ qua hàng đó
- studentId và dateOfBirth là optional

Trả về CHỈ JSON object, không có markdown, không có text thừa.`;

  const result = await callGeminiAPI(prompt, apiKey);
  return result.students || [];
}

/**
 * Upload file lên Gemini Files API (Giải pháp 4)
 * @param {File|Blob} file - File cần upload
 * @param {string} mimeType - MIME type của file
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} - File URI (gs://...)
 */
async function uploadFileToGemini(file, mimeType, apiKey, fileName = null) {
  // Gemini Files API yêu cầu multipart/form-data với 2 parts:
  // 1. metadata (JSON string) - key: "metadata"
  // 2. file (binary) - key: "file"
  const formData = new FormData();

  // Part 1: Metadata (JSON string)
  const metadata = {
    file: {
      displayName: fileName || (file instanceof File ? file.name : 'uploaded-file')
    }
  };
  // Append metadata như JSON string (không dùng Blob)
  formData.append('metadata', JSON.stringify(metadata));

  // Part 2: File (binary)
  // Đảm bảo file là Blob hoặc File object
  let fileToUpload = file;
  if (!(file instanceof File) && !(file instanceof Blob)) {
    // Nếu không phải File/Blob, tạo Blob
    fileToUpload = new Blob([file], { type: mimeType });
  }

  // Append file (KHÔNG dùng tham số thứ 3 để tránh tạo thêm entry)
  formData.append('file', fileToUpload);

  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

  console.log(`[AIFileProcessor] Uploading file to Gemini Files API: ${fileName || file.name}, mimeType: ${mimeType}`);

  const response = await fetch(url, {
    method: 'POST',
    body: formData
    // Không set Content-Type header, browser sẽ tự set với boundary
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: { message: errorText } };
    }
    console.error(`[AIFileProcessor] File upload failed:`, errorData);
    throw new Error(`Upload file thất bại: ${errorData.error?.message || response.statusText} (${response.status})`);
  }

  const data = await response.json();

  // Gemini Files API response structure (sau khi upload xong)
  // Response có thể là: { file: { uri: "gs://...", name: "...", ... } }
  // Hoặc: { uri: "gs://..." } (nếu response trả về trực tiếp)
  if (data.file && data.file.uri) {
    return data.file.uri; // gs://generativelanguage.googleapis.com/files/abc123
  } else if (data.uri) {
    return data.uri; // Fallback: có thể response trả về uri trực tiếp
  } else {
    console.error(`[AIFileProcessor] Unexpected response structure:`, data);
    throw new Error(`Response không có file.uri: ${JSON.stringify(data)}`);
  }
}

/**
 * Xóa file khỏi Gemini Files API (cleanup)
 * @param {string} fileUri - File URI cần xóa
 * @param {string} apiKey - Gemini API key
 */
async function deleteFileFromGemini(fileUri, apiKey) {
  // Extract file name từ URI: gs://.../files/abc123 → abc123
  const fileName = fileUri.split('/').pop();
  if (!fileName) return;

  const url = `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`;

  try {
    await fetch(url, {
      method: 'DELETE'
    });
    // File deleted (log đã được tối ưu)
  } catch (error) {
    console.warn(`[AIFileProcessor] Không thể xóa file ${fileName}:`, error);
  }
}

/**
 * Gọi Gemini API với file (dùng File API cho PDF/Images, inlineData cho text)
 * @param {string} prompt - Prompt text
 * @param {Array} fileData - Array of {fileName, mimeType, data}
 * @param {string} apiKey - Gemini API key
 * @param {Object} contextData - Optional context data
 * @returns {Promise<Object>} - AI response
 */
export async function callGeminiAPIWithFiles(prompt, fileData, apiKey, contextData = null) {
  // Chỉ dùng v1beta vì AI Studio 2025+ chỉ có v1beta
  const API_VERSIONS = ['v1beta'];
  // ⚠️ Ưu tiên models 2.5, CHỈ dùng models ĐÃ XÁC NHẬN tồn tại trong Usage page
  const MODELS = [
    'gemini-2.5-flash',           // Model tốt nhất, key mới sẽ có quota
    'gemini-2.0-flash-exp',       // Gemini 2.0 experimental (mạnh hơn lite)
    'gemini-exp-1206',            // Experimental (chất lượng cao)
    'gemini-exp-1114',            // Experimental 11/14
    'gemini-1.5-flash-8b',        // Flash 8B (nhẹ nhưng không yếu bằng lite)
    'gemini-1.5-flash',           // Legacy stable
    'gemini-1.5-pro',             // Legacy pro
    'gemini-2.5-flash-lite'       // Lite cuối cùng (parse JSON yếu)
  ];
  const REQUEST_TIMEOUT = 180000; // 180 giây cho file lớn

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key không được để trống. Vui lòng cập nhật API Key trong cài đặt.');
  }

  let lastError = null;
  const uploadedFileUris = []; // Để cleanup files sau khi xong

  // Build parts array với file và prompt
  const parts = [];

  // Thêm context data nếu có (ví dụ: danh sách câu hỏi để match)
  if (contextData) {
    parts.push({
      text: `Dữ liệu context:\n${JSON.stringify(contextData, null, 2)}\n\n`
    });
  }

  // Thêm files - TỐI ƯU: Gom tất cả ảnh vào 1 request với inlineData
  // ⚠️ TỐI ƯU: Force dùng inlineData cho ảnh nhỏ để giảm requests
  // Gemini inlineData limit: ~20MB per request
  // Tính tổng size (base64) để quyết định
  const INLINE_DATA_SIZE_LIMIT = 18 * 1024 * 1024; // 18MB (an toàn hơn 20MB)
  let totalBase64Size = 0;

  // Tính tổng size của tất cả files
  for (const file of fileData) {
    if (file.data) {
      totalBase64Size += file.data.length; // Base64 size
    }
  }

  const totalSizeMB = (totalBase64Size / 1024 / 1024).toFixed(2);
  const useInlineData = totalBase64Size < INLINE_DATA_SIZE_LIMIT;

  // ⚠️ QUAN TRỌNG: Dùng inlineData nếu tổng size < limit (giảm từ 7 requests xuống 1 request)
  if (!useInlineData) {
    console.warn(`[AI] ⚠️ ${totalSizeMB}MB > 18MB → File API (${fileData.length} requests)`);
  }

  for (const file of fileData) {
    const isImageOrPDF = file.mimeType && (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf');

    // ⚠️ CHỈ dùng File API nếu tổng size > limit HOẶC file quá lớn (> 10MB mỗi file)
    const fileBase64Size = file.data ? file.data.length : 0;
    const shouldUseFileAPI = !useInlineData || fileBase64Size > 10 * 1024 * 1024; // > 10MB per file

    if (isImageOrPDF && shouldUseFileAPI) {
      // Chỉ dùng File API nếu tổng size > limit
      try {
        const binaryString = atob(file.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: file.mimeType });

        const fileUri = await uploadFileToGemini(blob, file.mimeType, apiKey, file.fileName);
        uploadedFileUris.push(fileUri);

        parts.push({
          fileData: {
            mimeType: file.mimeType,
            fileUri: fileUri
          }
        });
        // Log đã được tối ưu - chỉ log khi cần
      } catch (error) {
        console.warn(`[AIFileProcessor] ⚠️ File API upload failed, fallback to inlineData:`, error);
        parts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        });
      }
    } else {
      // Dùng inlineData cho tất cả (ảnh nhỏ, text, hoặc khi tổng size < limit)
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
      // Log đã được tối ưu - chỉ log khi cần
    }
  }

  // Thêm prompt
  parts.push({
    text: prompt
  });

  // Thử từng API version và model
  for (const apiVersion of API_VERSIONS) {
    const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${apiVersion}/models`;

    for (const model of MODELS) {
      try {
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        // Chỉ log khi là lần đầu hoặc retry sau lỗi
        const modelIndex = MODELS.indexOf(model);
        if (modelIndex === 0) {
          console.log(`[AI] 🔍 ${apiVersion}/${model}`);
        } else if (lastError) {
          console.log(`[AI] ⚠️ Retry: ${apiVersion}/${model}`);
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              // ⚠️ Tăng maxOutputTokens đặc biệt cho gemini-2.5-flash-lite (response bị cắt)
              maxOutputTokens: model.includes('lite') ? 32768 : 16384
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || `Gemini API error: ${response.statusText}`;
          const error = new Error(errorMessage);
          error.status = response.status;
          error.model = model;
          error.errorData = errorData;
          lastError = error;

          // Chỉ log lỗi nghiêm trọng (không phải 404/429/400)
          if (response.status !== 429 && response.status !== 404 && response.status !== 400) {
            console.error(`[AI] ❌ ${model}: ${response.status} ${errorData.error?.message || response.statusText}`);
          }

          if (response.status === 404) {
            continue; // Skip 404, không cần log
          }

          if (response.status === 400) {
            // 400 có thể là API key expired hoặc invalid request
            const errorMsg = errorData.error?.message || '';

            // Nếu API key expired, THROW LUÔN (không thử model khác)
            if (errorMsg.includes('expired') || errorMsg.includes('API key not valid')) {
              throw new Error('❌ API Key đã hết hạn hoặc không hợp lệ.\n\n' +
                '🔑 VUI LÒNG:\n' +
                '1. Truy cập: https://aistudio.google.com/app/apikey\n' +
                '2. Tạo API Key MỚI (không dùng key cũ)\n' +
                '3. Copy key mới và cập nhật trong cài đặt\n\n' +
                '⚠️ LƯU Ý: Nếu vừa tạo key mà bị expired ngay, chờ 1-2 phút rồi thử lại.');
            }

            if (errorMsg.includes('MIME type') || errorMsg.includes('mimeType')) {
              continue; // Skip MIME type error
            }

            // Các lỗi 400 khác: thử model tiếp theo
            continue;
          }

          if (response.status === 401 || response.status === 403) {
            throw new Error(`API Key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API Key trong cài đặt.`);
          }

          // ⚠️ 429: Rate limit - Thử model tiếp theo
          if (response.status === 429) {
            const currentModelIndex = MODELS.indexOf(model);
            const nextModel = MODELS[currentModelIndex + 1];

            if (nextModel) {
              console.warn(`[AI] ⏱️ ${model} hết quota → thử ${nextModel}...`);
            } else {
              console.warn(`[AI] ❌ ${model} hết quota, không còn model fallback`);
            }
            lastError = error;
            continue; // Thử model tiếp theo
          }

          // Các lỗi khác throw
          throw error;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
          throw new Error('Không nhận được response từ Gemini API');
        }

        // Parse JSON TRƯỚC KHI delete file (để có thể thử model khác nếu parse lỗi)
        let jsonText = text.trim();

        // Clean JSON: Remove markdown, find JSON object, fix LaTeX escaping
        console.log(`[AI] 🔧 Cleaning JSON response from ${model}...`);
        jsonText = cleanJsonString(jsonText);
        
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }

        let result;
        try {
          console.log(`[AI] 📝 Attempting to parse JSON (length: ${jsonText.length} chars)...`);
          result = JSON.parse(jsonText);
        } catch (parseError) {
          // Log raw response để debug
          console.warn(`[AI] ⚠️ ${model} JSON parse error. Raw response (first 500 chars):`);
          console.warn(text.substring(0, 500));
          console.warn(`[AI] Parse error:`, parseError.message);

          // Thử extract chỉ phần questions nếu có
          const questionsMatch = jsonText.match(/"questions"\s*:\s*\[[\s\S]*\]/);
          if (questionsMatch) {
            try {
              result = { questions: JSON.parse('{' + questionsMatch[0] + '}').questions };
              console.log(`[AI] ✅ Extracted questions array successfully`);
            } catch {
              // Nếu vẫn lỗi, throw SyntaxError để thử model tiếp theo
              const syntaxError = new SyntaxError(`Không thể parse JSON: ${parseError.message}`);
              syntaxError.originalError = parseError;
              throw syntaxError;
            }
          } else {
            // Thử parse từng file/questions rieng lẻ
            const filesMatch = jsonText.match(/"files"\s*:\s*\[[\s\S]*?\]/);
            if (filesMatch) {
              try {
                result = JSON.parse('{' + filesMatch[0] + '}');
                console.log(`[AI] ✅ Extracted files array successfully`);
              } catch {
                const syntaxError = new SyntaxError(`Không thể parse JSON: ${parseError.message}`);
                syntaxError.originalError = parseError;
                throw syntaxError;
              }
            } else {
              // Không extract được, throw SyntaxError để thử model tiếp theo
              const syntaxError = new SyntaxError(`Không thể parse JSON: ${parseError.message}`);
              syntaxError.originalError = parseError;
              throw syntaxError;
            }
          }
        }

        // Xử lý kết quả
        if (result.fileTypes !== undefined) {
          if (!result.fileTypes || typeof result.fileTypes !== 'object') {
            result.fileTypes = {};
          }
        }

        if (result.questions !== undefined) {
          if (!Array.isArray(result.questions)) {
            result.questions = [];
          }
        }

        if (result.answers !== undefined) {
          if (!Array.isArray(result.answers)) {
            result.answers = [];
          }
        }

        // ⚠️ CHỈ delete file SAU KHI parse JSON thành công
        for (const fileUri of uploadedFileUris) {
          await deleteFileFromGemini(fileUri, apiKey).catch(err => {
            console.warn(`[AIFileProcessor] Không thể xóa file ${fileUri}:`, err);
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        if (error.message.includes('API Key không hợp lệ')) {
          throw error;
        }

        if (error.status === 404) {
          console.warn(`[AIFileProcessor] ${apiVersion}/${model} không tồn tại (404), thử tiếp...`);
          continue;
        }

        if (error.name === 'AbortError') {
          console.warn(`[AIFileProcessor] ${apiVersion}/${model} timeout, thử tiếp...`);
          continue;
        }

        // Xử lý 429 (Too Many Requests) - đã được xử lý ở trên (dòng 1225-1230)
        // Chỉ xử lý các lỗi network/timeout khác
        if (error.status === 429) {
          // Đã được xử lý ở trên (continue), không cần làm gì thêm
          continue;
        }

        if (error instanceof SyntaxError) {
          console.warn(`[AI] ⚠️ ${model}: JSON parse error, retry...`);
          continue;
        }

        // Các lỗi khác không cần log chi tiết (đã log ở trên)
      }
    }
  }

  // Cleanup uploaded files nếu có lỗi (sau khi thử hết tất cả models)
  for (const fileUri of uploadedFileUris) {
    await deleteFileFromGemini(fileUri, apiKey).catch(err => {
      console.warn(`[AIFileProcessor] Không thể xóa file ${fileUri}:`, err);
    });
  }

  // Error handling giống callGeminiAPI
  let errorMessage = '❌ Không thể kết nối đến AI. ';

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
 * Gọi Gemini API (chỉ text, không có file)
 */
async function callGeminiAPI(prompt, apiKey) {
  // Chỉ dùng v1beta vì AI Studio 2025+ chỉ có v1beta
  const API_VERSIONS = ['v1beta'];
  // Ưu tiên models 2.5, CHỈ dùng models tồn tại
  const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    'gemini-exp-1114',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash-lite'
  ];
  const REQUEST_TIMEOUT = 120000; // 120 giây cho nhiều file

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key không được để trống. Vui lòng cập nhật API Key trong cài đặt.');
  }

  let lastError = null;

  // Thử từng API version và model
  for (const apiVersion of API_VERSIONS) {
    const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${apiVersion}/models`;

    for (const model of MODELS) {
      try {
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

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
              temperature: 0.2, // Thấp để output ổn định
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 16384 // Tăng cho nhiều file
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || `Gemini API error: ${response.statusText}`;
          const error = new Error(errorMessage);
          error.status = response.status;
          error.model = model;
          error.errorData = errorData;
          lastError = error;

          // Nếu là 404, thử model tiếp theo
          if (response.status === 404) {
            console.warn(`[AIFileProcessor] Model ${model} không tồn tại (404), thử model tiếp theo...`);
            continue;
          }

          // ⚠️ 429: Rate limit - Thử model tiếp theo
          if (response.status === 429) {
            const currentModelIndex = MODELS.indexOf(model);
            const nextModel = MODELS[currentModelIndex + 1];
            
            if (nextModel) {
              console.warn(`[AIFileProcessor] ⏱️ ${model} hết quota → thử ${nextModel}...`);
            } else {
              console.warn(`[AIFileProcessor] ❌ ${model} hết quota, không còn model fallback`);
            }
            lastError = error;
            continue; // Thử model tiếp theo
          }

          // Nếu là 401/403, API key có vấn đề, không cần thử tiếp
          if (response.status === 401 || response.status === 403) {
            throw new Error(`API Key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API Key trong cài đặt.`);
          }

          throw error;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
          throw new Error('Không nhận được response từ Gemini API');
        }

        // Parse JSON - xử lý nhiều trường hợp
        let jsonText = text.trim();

        // Loại bỏ markdown code block
        if (jsonText.startsWith('```')) {
          const lines = jsonText.split('\n');
          jsonText = lines.slice(1, -1).join('\n').trim();
        }

        // Tìm JSON object trong text (nếu có text thừa)
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }

        let result;
        try {
          result = JSON.parse(jsonText);
        } catch (parseError) {
          // Thử extract chỉ phần questions nếu có
          const questionsMatch = jsonText.match(/"questions"\s*:\s*\[[\s\S]*\]/);
          if (questionsMatch) {
            result = { questions: JSON.parse('{' + questionsMatch[0] + '}').questions };
          } else {
            throw new Error(`Không thể parse JSON: ${parseError.message}`);
          }
        }

        // Xử lý kết quả tùy theo loại (có thể là fileTypes hoặc questions)
        if (result.fileTypes !== undefined) {
          // Kết quả nhận diện file types
          if (!result.fileTypes || typeof result.fileTypes !== 'object') {
            result.fileTypes = {};
          }
        }

        if (result.questions !== undefined) {
          // Kết quả parse questions
          if (!Array.isArray(result.questions)) {
            result.questions = [];
          }
        }

        return result;
      } catch (error) {
        lastError = error;

        // Nếu đã throw error ở trên (401/403), không cần thử tiếp
        if (error.message.includes('API Key không hợp lệ')) {
          throw error;
        }

        // Log warning nhưng tiếp tục thử model/version tiếp theo
        if (error.status === 404) {
          console.warn(`[AIFileProcessor] ${apiVersion}/${model} không tồn tại (404), thử tiếp...`);
          continue;
        }

        if (error.name === 'AbortError') {
          console.warn(`[AIFileProcessor] ${apiVersion}/${model} timeout, thử tiếp...`);
          continue;
        }

        if (error.message.includes('quota') || error.message.includes('limit')) {
          console.warn(`[AIFileProcessor] ${apiVersion}/${model} bị limit, thử tiếp...`);
          continue;
        }

        // Nếu là lỗi parse JSON, thử model tiếp theo
        if (error instanceof SyntaxError) {
          console.warn(`[AIFileProcessor] ${apiVersion}/${model} parse JSON lỗi, thử tiếp...`);
          continue;
        }

        // Các lỗi khác, log và thử tiếp
        console.warn(`[AIFileProcessor] ${apiVersion}/${model} thất bại:`, error.message);
      }
    }
  }

  // Nếu tất cả models đều thất bại, tạo thông báo lỗi chi tiết
  let errorMessage = '❌ Không thể kết nối đến AI. ';

  // Kiểm tra loại lỗi chính
  const all404 = lastError && lastError.status === 404;
  const all429 = lastError && lastError.status === 429;

  if (all404) {
    errorMessage += '\n\n🔑 VẤN ĐỀ: API Key của bạn không có quyền truy cập các model Gemini.\n\n';
    errorMessage += '📋 CÁCH KHẮC PHỤC:\n';
    errorMessage += '1. Truy cập: https://aistudio.google.com/app/apikey\n';
    errorMessage += '2. Tạo API Key mới hoặc kiểm tra API Key hiện tại\n';
    errorMessage += '3. Đảm bảo API Key có quyền truy cập Generative Language API\n';
    errorMessage += '4. Nếu dùng Google Cloud, cần bật "Generative Language API" trong Google Cloud Console\n';
    errorMessage += '5. Kiểm tra API Key có còn hiệu lực không\n\n';
    errorMessage += '💡 LƯU Ý: API Key từ AI Studio thường đã có quyền sẵn. Nếu vẫn lỗi, hãy tạo API Key mới.';
  } else if (all429) {
    errorMessage += '\n\n⏱️ VẤN ĐỀ: Đã vượt quá giới hạn sử dụng API (Rate Limit).\n\n';
    errorMessage += '📋 CÁCH KHẮC PHỤC:\n';
    errorMessage += '1. Đợi vài phút rồi thử lại (giới hạn sẽ được reset)\n';
    errorMessage += '2. Kiểm tra quota API Key tại: https://aistudio.google.com/app/apikey\n';
    errorMessage += '3. Nếu cần, nâng cấp gói API để tăng giới hạn\n';
    errorMessage += '4. Tránh gửi quá nhiều request trong thời gian ngắn\n\n';
    errorMessage += '💡 LƯU Ý: Hệ thống đã tự động đợi và retry, nhưng nếu vẫn lỗi, vui lòng đợi thêm.';
  } else if (lastError) {
    if (lastError.status === 401 || lastError.status === 403) {
      errorMessage += 'API Key không hợp lệ hoặc đã hết hạn. ';
      errorMessage += 'Vui lòng tạo API Key mới tại: https://aistudio.google.com/app/apikey';
    } else if (lastError.message.includes('quota') || lastError.message.includes('limit')) {
      errorMessage += 'Đã vượt quá giới hạn sử dụng API. ';
      errorMessage += 'Vui lòng đợi vài phút rồi thử lại hoặc nâng cấp gói API.';
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
