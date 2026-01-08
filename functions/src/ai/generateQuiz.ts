import * as functions from 'firebase-functions';
import { getGeminiClient } from '../utils/geminiClient';
import { processPDFWord } from '../fileProcessing/processPDFWord';

export const generateQuizFromFile = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { file, apiKey } = req.body;
    
    if (!file || !apiKey) {
      return res.status(400).json({ error: 'Missing file or apiKey' });
    }

    // Extract text from file
    const text = await processPDFWord(file);
    
    // Generate questions using Gemini
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Từ đoạn văn bản sau, hãy tạo các câu hỏi trắc nghiệm dạng JSON. Mỗi câu hỏi có: content (nội dung), options (mảng 4 đáp án), correctAnswer (A, B, C, hoặc D), explanation (giải thích). Trả về mảng JSON:

${text}

Trả về chỉ JSON array, không có text khác.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    // Parse JSON from response
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    res.json(questions);
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

