/**
 * Parse đáp án từ file Excel bằng code (không dùng AI)
 * Format: "Câu\Mã Đề | 101 | 103 | 105 | 107"
 *         "1 | B | C | C | B"
 */

import * as XLSX from 'xlsx';

/**
 * Parse Excel file chứa đáp án trắc nghiệm
 * @param {File} file - File Excel đáp án
 * @returns {Promise<Object>} - { examCode: { part: { questionNumber: answer } } }
 * 
 * Example:
 * {
 *   "101": {
 *     "PHẦN I": { "1": "B", "2": "A", ... },
 *     "PHẦN II": { "1": "SĐSĐ", "2": "ĐSĐĐ", ... },
 *     "PHẦN III": { "1": "-0,8.", "2": "21.", ... }
 *   },
 *   "103": { ... }
 * }
 */
export async function parseExcelAnswers(file) {
  if (!file) {
    throw new Error('File không được để trống');
  }

  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls') {
    throw new Error('Chỉ hỗ trợ file Excel (.xlsx, .xls)');
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('File Excel trống');
  }

  // Tìm dòng header: "Câu\Mã Đề | 101 | 103 | ..."
  let headerRowIndex = -1;
  let examCodes = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim().toLowerCase();
    if (firstCell.includes('câu') && firstCell.includes('mã đề')) {
      headerRowIndex = i;
      // Extract mã đề từ header: "Câu\Mã Đề | 101 | 103 | 105 | 107"
      examCodes = row.slice(1).filter(cell => {
        const code = String(cell || '').trim();
        return code && /^\d+$/.test(code); // Chỉ lấy số
      });
      break;
    }
  }

  if (headerRowIndex === -1 || examCodes.length === 0) {
    throw new Error('Không tìm thấy header "Câu\\Mã Đề" hoặc mã đề trong file Excel');
  }

  console.log(`[ExcelParser] Tìm thấy ${examCodes.length} mã đề:`, examCodes);

  // Parse đáp án từ các dòng sau header
  const result = {};
  examCodes.forEach(code => {
    result[code] = {};
  });

  let currentPart = 'PHẦN I'; // Mặc định PHẦN I
  let partCounter = 1;
  let lastQuestionNumber = 0; // Track để detect khi câu hỏi reset về 1 (bắt đầu phần mới)

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const questionNumber = String(row[0] || '').trim();
    
    // Check nếu là dòng phân cách phần (có thể có "PHẦN I", "PHẦN II", ...)
    if (questionNumber.toLowerCase().includes('phần')) {
      currentPart = questionNumber.toUpperCase();
      partCounter++;
      lastQuestionNumber = 0; // Reset khi chuyển phần
      console.log(`[ExcelParser] Phát hiện ${currentPart} tại dòng ${i + 1}`);
      continue;
    }

    // Skip nếu không phải số câu hỏi
    if (!questionNumber || !/^\d+$/.test(questionNumber)) {
      continue;
    }

    const qNum = parseInt(questionNumber);
    
    // Nếu câu hỏi reset về 1 sau khi đã có câu lớn hơn → chuyển phần
    // (Ví dụ: Câu 12 → Câu 1 → đây là PHẦN II)
    if (qNum === 1 && lastQuestionNumber > 1) {
      partCounter++;
      currentPart = partCounter === 2 ? 'PHẦN II' : 
                     partCounter === 3 ? 'PHẦN III' : 
                     partCounter === 4 ? 'PHẦN IV' : 
                     `PHẦN ${partCounter}`;
      console.log(`[ExcelParser] Tự động chuyển sang ${currentPart} (câu hỏi reset về 1)`);
    }
    lastQuestionNumber = qNum;

    // Parse đáp án cho từng mã đề
    examCodes.forEach((code, codeIndex) => {
      const answerIndex = codeIndex + 1; // +1 vì cột đầu là "Câu"
      if (answerIndex >= row.length) return;

      const answer = String(row[answerIndex] || '').trim();
      if (!answer) return;

      // Dùng currentPart (từ dòng phân cách hoặc auto-detect)
      if (!result[code][currentPart]) {
        result[code][currentPart] = {};
      }

      result[code][currentPart][questionNumber] = answer.toUpperCase();
    });
  }

  console.log(`[ExcelParser] Parse thành công:`, result);
  return result;
}

/**
 * Match đáp án từ Excel với questions hiện có
 * @param {Array} questions - Danh sách câu hỏi đã parse
 * @param {Object} answersByExamCode - Kết quả từ parseExcelAnswers
 * @param {string} examCode - Mã đề cần match (optional, nếu không có thì match tất cả)
 * @returns {Array} - Questions với correctAnswer đã được cập nhật
 */
export function matchAnswersToQuestions(questions, answersByExamCode, examCode = null) {
  console.log(`[ExcelParser] Matching answers to ${questions.length} questions...`);
  console.log(`[ExcelParser] Questions sample:`, questions.slice(0, 2));
  console.log(`[ExcelParser] Answers structure:`, answersByExamCode);
  
  // ⚠️ TRỰC TIẾP match từng question với đáp án, KHÔNG group, KHÔNG sửa questionNumber
  const updatedQuestions = questions.map((question, index) => {
    // CHỈ gán questionNumber nếu thiếu hoàn toàn (fallback)
    if (!question.questionNumber && !question.number) {
      console.warn(`[ExcelParser] ⚠️ Question ${index} thiếu questionNumber, skip matching`);
      return question; // Không match được nếu không có số câu
    }

    // Nếu có examCode cụ thể, chỉ match với mã đề đó
    const codesToMatch = examCode ? [examCode] : Object.keys(answersByExamCode);
    
    // Debug question structure
    if (index < 3) {
      console.log(`[ExcelParser] Question ${index}:`, {
        part: question.part,
        partName: question.partName,
        questionNumber: question.questionNumber,
        number: question.number
      });
    }
    
    for (const code of codesToMatch) {
      const answersForCode = answersByExamCode[code];
      if (!answersForCode) continue;

      // Tìm đáp án theo part và questionNumber
      // Support cả part (số La Mã: "I", "II", "III") và partName (string: "PHẦN I")
      const partName = question.partName || (question.part ? `PHẦN ${question.part}` : 'PHẦN I');
      const partKey = partName.toUpperCase().trim(); // Normalize: "PHẦN I", "PHẦN II", ...
      
      // ⚠️ Dùng questionNumber từ AI (KHÔNG GHI ĐÈ)
      const questionNumber = String(question.questionNumber || question.number || '').trim();
      
      if (!questionNumber) {
        console.warn(`[ExcelParser] ⚠️ Question ${index} không có questionNumber, bỏ qua`);
        continue;
      }

      if (index < 3) {
        console.log(`[ExcelParser] Trying to match: partKey="${partKey}", questionNumber="${questionNumber}"`);
        console.log(`[ExcelParser] Available parts in answers:`, Object.keys(answersForCode));
        if (answersForCode[partKey]) {
          console.log(`[ExcelParser] Available questions in ${partKey}:`, Object.keys(answersForCode[partKey]));
        }
      }

      // Try match với partKey (PHẦN I, PHẦN II, ...)
      if (answersForCode[partKey] && answersForCode[partKey][questionNumber]) {
        const answer = answersForCode[partKey][questionNumber];
        
        // ⚠️ Đặc biệt cho PHẦN II: Đáp án dạng "SĐSĐ" là 1 câu với 4 ý (a,b,c,d)
        if (partKey === 'PHẦN II' || question.part === 'II') {
          console.log(`[ExcelParser] ✅ Matched PHẦN II question ${index}: Câu ${questionNumber} = ${answer}`);
        } else {
          console.log(`[ExcelParser] ✅ Matched question ${index}: ${partKey} - Câu ${questionNumber} = ${answer}`);
        }
        
        return {
          ...question,
          correctAnswer: answer,
          examCode: code
        };
      }
      
      // Fallback 1: thử match với part number nếu có (question.part = "I" → "PHẦN I")
      if (question.part) {
        const fallbackPartKey = `PHẦN ${question.part}`.toUpperCase().trim();
        if (answersForCode[fallbackPartKey] && answersForCode[fallbackPartKey][questionNumber]) {
          console.log(`[ExcelParser] ✅ Matched question ${index} (fallback): ${fallbackPartKey} - Câu ${questionNumber}`);
          return {
            ...question,
            correctAnswer: answersForCode[fallbackPartKey][questionNumber],
            examCode: code
          };
        }
      }
    }

    if (index < 3) {
      console.log(`[ExcelParser] ❌ No match for question ${index}`);
    }
    return question; // Không match được, trả về question gốc
  });

  const matchedCount = updatedQuestions.filter(q => q.correctAnswer).length;
  console.log(`[ExcelParser] Matched ${matchedCount}/${questions.length} questions`);
  
  return updatedQuestions;
}
