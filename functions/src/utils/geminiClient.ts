import { GoogleGenerativeAI } from '@google/generative-ai';

export function getGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

