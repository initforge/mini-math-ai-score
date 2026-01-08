import JSZip from 'jszip';
import * as XLSX from 'xlsx';

/**
 * Nhận diện loại file dựa trên nội dung
 * @param {File} file - File cần nhận diện
 * @returns {Promise<{type: string, confidence: number}>}
 */
export async function identifyFileType(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  
  try {
    if (ext === 'docx' || ext === 'doc') {
      return await identifyDocxType(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return await identifyExcelType(file);
    } else if (ext === 'pdf') {
      // TODO: Implement PDF identification
      return { type: 'unknown', confidence: 0 };
    }
    
    return { type: 'unknown', confidence: 0 };
  } catch (error) {
    console.error('Error identifying file type:', error);
    return { type: 'unknown', confidence: 0 };
  }
}

/**
 * Nhận diện loại file DOCX
 */
async function identifyDocxType(file) {
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  
  if (!zip.file('word/document.xml')) {
    return { type: 'unknown', confidence: 0 };
  }
  
  const documentXml = await zip.file('word/document.xml').async('string');
  const text = extractTextFromXml(documentXml).toLowerCase();
  
  // Keywords với weight (độ quan trọng)
  // Keywords quan trọng hơn có weight cao hơn
  const examKeywords = [
    { keyword: 'phần i', weight: 2 },
    { keyword: 'phần ii', weight: 2 },
    { keyword: 'phần iii', weight: 2 },
    { keyword: 'phần iv', weight: 2 },
    { keyword: 'câu trắc nghiệm', weight: 3 },
    { keyword: 'trắc nghiệm nhiều phương án', weight: 3 },
    { keyword: 'mã đề', weight: 2 },
    { keyword: 'đề thi', weight: 2 },
    { keyword: 'kiểm tra', weight: 1 },
    { keyword: 'bài thi', weight: 1 },
    { keyword: 'thời gian làm bài', weight: 2 },
    { keyword: 'họ và tên', weight: 1 },
    { keyword: 'số báo danh', weight: 1 },
    { keyword: 'câu hỏi', weight: 1 },
    { keyword: 'đáp án a', weight: 1 },
    { keyword: 'đáp án b', weight: 1 },
    { keyword: 'đáp án c', weight: 1 },
    { keyword: 'đáp án d', weight: 1 }
  ];
  
  const essayAnswerKeywords = [
    { keyword: 'phần tự luận', weight: 5 }, // Rất quan trọng
    { keyword: 'lời giải', weight: 3 },
    { keyword: 'điểm', weight: 2 },
    { keyword: 'câu 1:', weight: 1 },
    { keyword: 'câu 2:', weight: 1 },
    { keyword: 'câu 3:', weight: 1 },
    { keyword: 'mã đề chẵn', weight: 2 },
    { keyword: 'mã đề lẻ', weight: 2 },
    { keyword: 'a∪b', weight: 1 },
    { keyword: 'a∩b', weight: 1 },
    { keyword: 'a\\b', weight: 1 }
  ];
  
  // Tính điểm với weight
  let examPaperScore = 0;
  let essayAnswerScore = 0;
  let examPaperMaxScore = 0;
  let essayAnswerMaxScore = 0;
  
  examKeywords.forEach(({ keyword, weight }) => {
    examPaperMaxScore += weight;
    if (text.includes(keyword)) {
      examPaperScore += weight;
    }
  });
  
  essayAnswerKeywords.forEach(({ keyword, weight }) => {
    essayAnswerMaxScore += weight;
    if (text.includes(keyword)) {
      essayAnswerScore += weight;
    }
  });
  
  // Tính confidence dựa trên tỷ lệ điểm đạt được
  const examPaperConfidence = examPaperMaxScore > 0 ? examPaperScore / examPaperMaxScore : 0;
  const essayAnswerConfidence = essayAnswerMaxScore > 0 ? essayAnswerScore / essayAnswerMaxScore : 0;
  
  // Nếu có "PHẦN TỰ LUẬN" và confidence cao, ưu tiên đáp án tự luận
  if (text.includes('phần tự luận') && essayAnswerConfidence >= 0.3) {
    return { 
      type: 'essay_answer', 
      confidence: Math.min(essayAnswerConfidence, 1) 
    };
  }
  
  // Nếu có nhiều keywords của đề thi
  if (examPaperScore >= 8 || examPaperConfidence >= 0.4) {
    return { 
      type: 'exam_paper', 
      confidence: Math.min(examPaperConfidence, 1) 
    };
  }
  
  // Nếu có keywords của đáp án tự luận
  if (essayAnswerConfidence >= 0.3) {
    return { 
      type: 'essay_answer', 
      confidence: Math.min(essayAnswerConfidence, 1) 
    };
  }
  
  return { type: 'unknown', confidence: 0 };
}

/**
 * Nhận diện loại file Excel
 */
async function identifyExcelType(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  if (!workbook.SheetNames.length) {
    return { type: 'unknown', confidence: 0 };
  }
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (!jsonData.length) {
    return { type: 'unknown', confidence: 0 };
  }
  
  // Lấy hàng đầu tiên để kiểm tra
  const firstRow = jsonData[0];
  const firstRowText = Array.isArray(firstRow) ? firstRow.join(' ').toLowerCase() : '';
  
  // Kiểm tra đáp án trắc nghiệm/đúng sai/trả lời ngắn
  // Có "Câu\Mã Đề" hoặc "Mã Đề" và có các mã đề số
  let answerSheetScore = 0;
  if (firstRowText.includes('câu') && firstRowText.includes('mã đề')) {
    answerSheetScore += 2;
  }
  if (firstRowText.includes('mã đề')) {
    answerSheetScore += 1;
  }
  
  // Kiểm tra có các đáp án A, B, C, D hoặc S, Đ
  let hasABCD = false;
  let hasSD = false;
  for (let i = 1; i < Math.min(20, jsonData.length); i++) {
    const row = jsonData[i];
    if (Array.isArray(row)) {
      const rowText = row.join(' ').toUpperCase();
      if (/[ABCD]/.test(rowText)) hasABCD = true;
      if (/[SĐ]/.test(rowText)) hasSD = true;
    }
  }
  
  if (hasABCD) answerSheetScore += 2;
  if (hasSD) answerSheetScore += 1;
  
  // Kiểm tra danh sách học sinh
  let studentListScore = 0;
  const studentKeywords = ['mã học sinh', 'họ và tên', 'họ tên', 'ngày sinh', 'stt'];
  studentKeywords.forEach(keyword => {
    if (firstRowText.includes(keyword)) studentListScore += 1;
  });
  
  // Nếu có "BẢNG ĐIỂM" hoặc "DANH SÁCH"
  if (firstRowText.includes('bảng điểm') || firstRowText.includes('danh sách')) {
    studentListScore += 2;
  }
  
  // Tính confidence dựa trên tỷ lệ điểm
  const maxAnswerSheetScore = 5; // Tối đa 5 điểm
  const maxStudentListScore = 5; // Tối đa 5 điểm
  
  // Quyết định loại file với confidence chính xác hơn
  if (answerSheetScore >= 3) {
    const confidence = Math.min(answerSheetScore / maxAnswerSheetScore, 1);
    // Nếu có cả "Câu" và "Mã Đề" + có đáp án → confidence cao
    if (firstRowText.includes('câu') && firstRowText.includes('mã đề') && (hasABCD || hasSD)) {
      return { type: 'answer_sheet', confidence: Math.min(confidence + 0.2, 1) };
    }
    return { type: 'answer_sheet', confidence };
  }
  
  if (studentListScore >= 3) {
    const confidence = Math.min(studentListScore / maxStudentListScore, 1);
    // Nếu có đủ các trường quan trọng → confidence cao
    if (firstRowText.includes('mã học sinh') && 
        (firstRowText.includes('họ và tên') || firstRowText.includes('họ tên'))) {
      return { type: 'student_list', confidence: Math.min(confidence + 0.15, 1) };
    }
    return { type: 'student_list', confidence };
  }
  
  return { type: 'unknown', confidence: 0 };
}

/**
 * Extract text từ XML
 */
function extractTextFromXml(xml) {
  return xml
    .replace(/<w:br\s*\/?>/gi, '\n')
    .replace(/<w:p[^>]*>/gi, '\n')
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

