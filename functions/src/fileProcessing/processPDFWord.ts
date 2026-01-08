import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export async function processPDFWord(file: { type: string; data: Buffer }): Promise<string> {
  if (file.type === 'application/pdf') {
    const data = await pdfParse(file.data);
    return data.text;
  } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
    const result = await mammoth.extractRawText({ buffer: file.data });
    return result.value;
  } else {
    throw new Error('Unsupported file type');
  }
}

