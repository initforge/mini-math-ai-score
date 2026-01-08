import * as functions from 'firebase-functions';
import { generateQuizFromFile } from './ai/generateQuiz';
import { suggestQuizFromBank } from './ai/suggestQuiz';
import { gradeEssay } from './ai/gradeEssay';
import { explainAnswer } from './ai/explainAnswer';

export const generateQuizFromFileFunction = functions.https.onRequest(generateQuizFromFile);
export const suggestQuizFromBankFunction = functions.https.onRequest(suggestQuizFromBank);
export const gradeEssayFunction = functions.https.onRequest(gradeEssay);
export const explainAnswerFunction = functions.https.onRequest(explainAnswer);

