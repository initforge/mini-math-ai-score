import { QdrantClient } from '@qdrant/js-client-rest';

// Qdrant client instance
const qdrantClient = new QdrantClient({
  url: 'http://localhost:6333',
});

// Collection name for questions
const COLLECTION_NAME = 'exam_questions';

/**
 * Initialize Qdrant collection for storing question vectors
 */
export async function initializeQdrantCollection() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME
    );

    if (!exists) {
      // Create collection with 768 dimensions (Gemini text-embedding-004)
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
      });
      console.log('Qdrant collection created successfully');
    }
  } catch (error) {
    console.error('Error initializing Qdrant:', error);
    throw error;
  }
}

/**
 * Store question with vector embedding
 * @param {string} questionId - Unique question ID from Firebase
 * @param {Array<number>} vector - Embedding vector from Gemini
 * @param {Object} payload - Question metadata
 */
export async function storeQuestionVector(questionId, vector, payload) {
  try {
    await qdrantClient.upsert(COLLECTION_NAME, {
      points: [
        {
          id: questionId,
          vector: vector,
          payload: {
            questionText: payload.questionText,
            subject: payload.subject,
            topic: payload.topic || '',
            difficulty: payload.difficulty || '',
            questionType: payload.questionType || '',
            createdBy: payload.createdBy || '',
            createdAt: payload.createdAt || Date.now(),
          },
        },
      ],
    });
  } catch (error) {
    console.error('Error storing question vector:', error);
    throw error;
  }
}

/**
 * Search for similar questions using vector similarity
 * @param {Array<number>} queryVector - Query embedding vector
 * @param {number} limit - Number of results to return
 * @param {Object} filter - Optional filters (subject, difficulty, etc.)
 */
export async function searchSimilarQuestions(queryVector, limit = 10, filter = null) {
  try {
    const searchParams = {
      vector: queryVector,
      limit: limit,
    };

    // Add filters if provided
    if (filter) {
      searchParams.filter = {
        must: [],
      };

      if (filter.subject) {
        searchParams.filter.must.push({
          key: 'subject',
          match: { value: filter.subject },
        });
      }

      if (filter.difficulty) {
        searchParams.filter.must.push({
          key: 'difficulty',
          match: { value: filter.difficulty },
        });
      }

      if (filter.topic) {
        searchParams.filter.must.push({
          key: 'topic',
          match: { value: filter.topic },
        });
      }
    }

    const results = await qdrantClient.search(COLLECTION_NAME, searchParams);
    return results;
  } catch (error) {
    console.error('Error searching questions:', error);
    throw error;
  }
}

/**
 * Delete question vector by ID
 * @param {string} questionId - Question ID to delete
 */
export async function deleteQuestionVector(questionId) {
  try {
    await qdrantClient.delete(COLLECTION_NAME, {
      points: [questionId],
    });
  } catch (error) {
    console.error('Error deleting question vector:', error);
    throw error;
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats() {
  try {
    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    return info;
  } catch (error) {
    console.error('Error getting collection stats:', error);
    throw error;
  }
}

export { qdrantClient, COLLECTION_NAME };
