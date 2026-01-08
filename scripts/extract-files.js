import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agencyDir = path.join(__dirname, '..', 'agency');
const outputDir = path.join(__dirname, '..', 'agency', 'extracted');

// Tạo thư mục output nếu chưa có
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Hàm extract từ .docx (file ZIP chứa XML)
async function extractDocx(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    
    // Đọc file word/document.xml
    const documentXml = await zip.file('word/document.xml').async('string');
    
    // Extract text từ XML với format tốt hơn
    let text = documentXml
      // Giữ lại line breaks từ <w:br/> và <w:p>
      .replace(/<w:br\s*\/?>/gi, '\n')
      .replace(/<w:p[^>]*>/gi, '\n')
      .replace(/<\/w:p>/gi, '\n')
      // Xóa tất cả XML tags khác
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Clean up whitespace nhưng giữ line breaks
      .replace(/[ \t]+/g, ' ') // Nhiều spaces thành 1
      .replace(/\n\s+/g, '\n') // Xóa spaces đầu dòng
      .replace(/\s+\n/g, '\n') // Xóa spaces cuối dòng
      .replace(/\n{3,}/g, '\n\n') // Nhiều line breaks thành 2
      .trim();
    
    return text;
  } catch (error) {
    console.error(`Error extracting ${filePath}:`, error.message);
    return null;
  }
}

// Hàm extract từ .xlsx hoặc .xls
function extractExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    let allText = '';
    
    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      allText += `\n=== Sheet: ${sheetName} ===\n\n`;
      jsonData.forEach((row, rowIndex) => {
        if (Array.isArray(row)) {
          // Lọc bỏ các cell rỗng ở cuối
          const filteredRow = row.filter((cell, idx) => {
            // Giữ lại nếu cell có giá trị hoặc là một trong 5 cột đầu
            return cell !== '' && cell !== null && cell !== undefined || idx < 5;
          });
          
          // Chỉ in row nếu có ít nhất 1 cell có giá trị
          if (filteredRow.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
            const rowText = filteredRow.join(' | ');
            allText += `Row ${rowIndex + 1}: ${rowText}\n`;
          }
        } else {
          allText += `Row ${rowIndex + 1}: ${JSON.stringify(row)}\n`;
        }
      });
      allText += '\n';
    });
    
    return allText;
  } catch (error) {
    console.error(`Error extracting ${filePath}:`, error.message);
    return null;
  }
}

// Hàm extract từ .pdf (cần pdf-parse hoặc pdf.js)
async function extractPdf(filePath) {
  // TODO: Cần cài đặt pdf-parse hoặc dùng pdf.js
  console.warn('PDF extraction not implemented yet. Need pdf-parse package.');
  return null;
}

// Main function
async function extractAllFiles() {
  const files = fs.readdirSync(agencyDir);
  
  for (const file of files) {
    if (file === 'extracted') continue; // Bỏ qua thư mục extracted
    
    const filePath = path.join(agencyDir, file);
    const stats = fs.statSync(filePath);
    
    if (!stats.isFile()) continue;
    
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);
    const outputPath = path.join(outputDir, `${baseName}.txt`);
    
    console.log(`Processing: ${file}...`);
    
    let content = null;
    
    if (ext === '.docx') {
      content = await extractDocx(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      content = extractExcel(filePath);
    } else if (ext === '.pdf') {
      content = await extractPdf(filePath);
    } else {
      console.log(`Skipping ${file} - unsupported format`);
      continue;
    }
    
    if (content) {
      fs.writeFileSync(outputPath, content, 'utf8');
      console.log(`✓ Extracted to: ${outputPath}`);
    } else {
      console.log(`✗ Failed to extract: ${file}`);
    }
  }
  
  console.log('\n✅ Extraction complete!');
  console.log(`📁 Output directory: ${outputDir}`);
}

// Chạy
extractAllFiles().catch(console.error);

