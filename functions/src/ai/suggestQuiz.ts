import * as functions from 'firebase-functions';
import { getGeminiClient } from '../utils/geminiClient';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();

export const suggestQuizFromBank = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { subject, difficulty, count, apiKey } = req.body;
    
    if (!subject || !difficulty || !count || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Query question bank
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef
      .orderByChild('subject')
      .equalTo(subject)
      .once('value');
    
    let questions = Object.entries(snapshot.val() || {})
      .map(([id, q]: [string, any]) => ({ id, ...q }))
      .filter((q: any) => q.difficulty === difficulty);
    
    // Use Gemini to suggest optimal set
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Từ danh sách câu hỏi sau, hãy đề xuất ${count} câu hỏi tối ưu để tạo đề thi. Yêu cầu:
- Tránh trùng lặp nội dung
- Phủ rộng kiến thức
- Độ khó phù hợp

Danh sách câu hỏi (JSON):
${JSON.stringify(questions, null, 2)}

Trả về mảng ID của các câu hỏi được đề xuất, chỉ JSON array: ["id1", "id2", ...]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    const suggestedIds = JSON.parse(jsonMatch[0]);
    const suggestedQuestions = questions.filter((q: any) => suggestedIds.includes(q.id));
    
    res.json(suggestedQuestions);
  } catch (error) {
    console.error('Error suggesting quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

