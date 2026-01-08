import * as functions from 'firebase-functions';
import { getGeminiClient } from '../utils/geminiClient';

export const gradeEssay = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, studentAnswer, maxPoints, apiKey } = req.body;
    
    if (!question || !studentAnswer || !maxPoints || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Grade essay using Gemini
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Chấm điểm câu tự luận sau:

Câu hỏi: ${question}
Câu trả lời của học sinh: ${studentAnswer}
Điểm tối đa: ${maxPoints}

Hãy chấm điểm và đưa ra nhận xét. Trả về JSON:
{
  "score": số điểm (0-${maxPoints}),
  "feedback": "Nhận xét chi tiết"
}

Chỉ trả về JSON, không có text khác.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    const grading = JSON.parse(jsonMatch[0]);
    
    res.json(grading);
  } catch (error) {
    console.error('Error grading essay:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

