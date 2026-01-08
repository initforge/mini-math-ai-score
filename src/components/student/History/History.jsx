import { useEffect, useState } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import Modal from '../../common/Modal';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import HistoryList from './HistoryList';
import ExamDetail from './ExamDetail';
import './History.css';

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!user) return;

    loadHistory();
    
    const unsubscribe = databaseService.subscribe('examResults', (resultsData) => {
      if (resultsData) {
        const studentHistory = getStudentHistory(resultsData);
        setHistory(studentHistory);
      }
    });

    return unsubscribe;
  }, [user]);

  const getStudentHistory = async (resultsData) => {
    const historyList = [];
    
    // Group results by examId to count attempts
    const examAttempts = {};
    
    for (const [examId, results] of Object.entries(resultsData)) {
      if (results[user.id]) {
        // Count attempts for this exam
        if (!examAttempts[examId]) {
          examAttempts[examId] = [];
        }
        examAttempts[examId].push(results[user.id]);
      }
    }
    
    // Build history with exam info and attempt count
    for (const [examId, attempts] of Object.entries(examAttempts)) {
      // Try examTemplates first (new structure), fallback to exams (old structure)
      let exam = await databaseService.read(`examTemplates/${examId}`);
      if (!exam) {
        exam = await databaseService.read(`exams/${examId}`);
      }
      
      // Add each attempt with attempt number
      attempts.forEach((result, index) => {
        historyList.push({
          examId,
          exam: exam || { title: 'Đề thi không tìm thấy', subject: '' },
          result,
          attemptNumber: index + 1,
          totalAttempts: attempts.length
        });
      });
    }
    
    return historyList.sort((a, b) => 
      (b.result.submittedAt || 0) - (a.result.submittedAt || 0)
    );
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const resultsData = await databaseService.read('examResults');
      if (resultsData) {
        const studentHistory = await getStudentHistory(resultsData);
        setHistory(studentHistory);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (historyItem) => {
    setSelectedExam(historyItem);
    setShowDetail(true);
  };

  return (
    <Layout>
      <div className="history-page">
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Lịch sử thi"
              subtitle="Xem lại các bài thi đã làm"
            />
          </div>
        </div>
        <div className="page-container">
          {loading ? (
          <Loading />
        ) : (
          <HistoryList 
            history={history} 
            onViewDetail={handleViewDetail}
          />
        )}

        <Modal
          isOpen={showDetail}
          onClose={() => {
            setShowDetail(false);
            setSelectedExam(null);
          }}
          title={selectedExam?.exam.title}
        >
          {selectedExam && (
            <ExamDetail 
              exam={selectedExam.exam}
              result={selectedExam.result}
            />
          )}
          </Modal>
        </div>
      </div>
    </Layout>
  );
}
