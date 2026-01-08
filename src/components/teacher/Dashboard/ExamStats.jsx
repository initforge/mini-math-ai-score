import { useState, useEffect } from 'react';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import './ExamStats.css';

export default function ExamStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    averageScore: 0,
    totalStudents: 0,
    completedStudents: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
    
    // Subscribe exams để cập nhật khi có kỳ thi mới hoặc status thay đổi
    const unsubscribeExams = databaseService.subscribe('exams', () => {
      loadStats();
    });

    // Subscribe examResults để cập nhật khi học sinh nộp bài
    const unsubscribeResults = databaseService.subscribe('examResults', () => {
      loadStats();
    });

    return () => {
      unsubscribeExams();
      unsubscribeResults();
    };
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Lấy tất cả kỳ thi đã hoàn thành của giáo viên
      const examsData = await databaseService.read('exams');
      if (!examsData) {
        setStats({ averageScore: 0, totalStudents: 0, completedStudents: 0, completionRate: 0 });
        setLoading(false);
        return;
      }

      const teacherExams = Object.entries(examsData)
        .map(([id, exam]) => ({ id, ...exam }))
        .filter(exam => exam.teacherId === user.id && exam.status === 'completed');

      if (teacherExams.length === 0) {
        setStats({ averageScore: 0, totalStudents: 0, completedStudents: 0, completionRate: 0 });
        setLoading(false);
        return;
      }

      // Tính tổng hợp từ tất cả kỳ thi
      let totalScore = 0;
      let totalResults = 0;
      let totalStudents = new Set();
      let completedStudents = new Set();

      for (const exam of teacherExams) {
        const resultsData = await databaseService.read(`examResults/${exam.id}`);
        if (resultsData) {
          const results = Object.entries(resultsData).map(([id, result]) => ({ id, ...result }));
          
          results.forEach(result => {
            totalStudents.add(result.studentId);
            if (result.status === 'submitted') {
              completedStudents.add(result.studentId);
              totalScore += result.score || 0;
              totalResults++;
            }
          });
        }
      }

      const averageScore = totalResults > 0 ? totalScore / totalResults : 0;
      const completionRate = totalStudents.size > 0 
        ? (completedStudents.size / totalStudents.size) * 100 
        : 0;

      setStats({
        averageScore: Math.round(averageScore * 100) / 100,
        totalStudents: totalStudents.size,
        completedStudents: completedStudents.size,
        completionRate: Math.round(completionRate)
      });
    } catch (error) {
      console.error('Error loading exam stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Card className="exam-stats-card">
      <h2>Thống kê kỳ thi</h2>
      <div className="stats-content">
        <div className="stat-item total">
          <div className="stat-value">{stats.averageScore}</div>
          <div className="stat-label">Điểm trung bình</div>
        </div>
        <div className="stats-by-class">
          <div className="class-stat-item">
            <span className="class-name">Học sinh đã làm bài</span>
            <span className="class-count">{stats.completedStudents}/{stats.totalStudents}</span>
          </div>
          <div className="class-stat-item">
            <span className="class-name">Tỷ lệ hoàn thành</span>
            <span className="class-count">{stats.completionRate}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

