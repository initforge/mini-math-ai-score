import { useState, useEffect } from 'react';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import './AIInsights.css';

export default function AIInsights({ examId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, [examId]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const results = await databaseService.read(`examResults/${examId}`);
      if (!results) {
        setLoading(false);
        return;
      }

      const resultsList = Object.values(results);
      const totalStudents = resultsList.length;
      
      if (totalStudents === 0) {
        setLoading(false);
        return;
      }

      // Get exam to get questions
      const exam = await databaseService.read(`exams/${examId}`);
      if (!exam || !exam.questions) {
        setLoading(false);
        return;
      }

      // Calculate wrong answer rates for each question
      const questionStats = {};
      
      resultsList.forEach(result => {
        if (result.details) {
          Object.entries(result.details).forEach(([questionId, detail]) => {
            if (!detail.correct) {
              questionStats[questionId] = (questionStats[questionId] || 0) + 1;
            }
          });
        }
      });

      // Generate insights for questions with >50% wrong rate
      const insightsList = Object.entries(questionStats)
        .filter(([_, count]) => (count / totalStudents) > 0.5)
        .map(([questionId, count]) => {
          const wrongRate = Math.round((count / totalStudents) * 100);
          const questionOrder = exam.questions.findIndex(q => q.questionId === questionId) + 1;
          
          return {
            questionId,
            questionOrder: questionOrder || questionId,
            wrongRate,
            message: `Câu ${questionOrder || questionId} có ${wrongRate}% lớp làm sai, thầy cô nên giảng lại phần này`
          };
        })
        .sort((a, b) => b.wrongRate - a.wrongRate);

      setInsights(insightsList);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  if (insights.length === 0) {
    return (
      <Card>
        <p className="no-insights">Không có insights nào. Tất cả học sinh đều làm tốt!</p>
      </Card>
    );
  }

  return (
    <div className="ai-insights">
      <Card>
        <h2>Phân tích AI</h2>
        <p className="insights-description">
          Dưới đây là các câu hỏi có nhiều học sinh làm sai, cần được giảng lại:
        </p>
        <div className="insights-list">
          {insights.map((insight, index) => (
            <div key={insight.questionId} className="insight-card">
              <div className="insight-header">
                <span className="insight-number">#{index + 1}</span>
                <span className="insight-rate">{insight.wrongRate}% sai</span>
              </div>
              <p className="insight-message">{insight.message}</p>
              <div className="insight-bar">
                <div 
                  className="insight-bar-fill"
                  style={{ width: `${insight.wrongRate}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

