import * as functions from 'firebase-functions';
import { getGeminiClient } from '../utils/geminiClient';

export const explainAnswer = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, studentAnswer, correctAnswer, explanation, apiKey } = req.body;
    
    if (!question || !studentAnswer || !correctAnswer || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Explain answer using Gemini
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Giải thích tại sao câu trả lời của học sinh sai:

Câu hỏi: ${question}
Câu trả lời của học sinh: ${studentAnswer}
Đáp án đúng: ${correctAnswer}
${explanation ? `Giải thích: ${explanation}` : ''}

Hãy giải thích một cách dễ hiểu, thân thiện tại sao câu trả lời sai và cách làm đúng.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanationText = response.text();
    
    res.json({ explanation: explanationText });
  } catch (error) {
    console.error('Error explaining answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

