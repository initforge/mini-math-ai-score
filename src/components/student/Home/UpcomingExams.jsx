import { useEffect, useState } from 'react';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Loading from '../../common/Loading';
import { useNavigate } from 'react-router-dom';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import './UpcomingExams.css';

export default function UpcomingExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    loadExams();
    
    const unsubscribe = databaseService.subscribe('examTemplates', async (templatesData) => {
      if (templatesData) {
        const studentExams = await getStudentExams(templatesData);
        setExams(studentExams);
      }
    });

    return unsubscribe;
  }, [user]);

  const getStudentExams = async (templatesData) => {
    if (!user?.id) return [];
    
    try {
      // Get classes that include this student
      const classesData = await databaseService.read('classes');
      if (!classesData) return [];
      
      const studentClasses = Object.entries(classesData)
        .filter(([_, cls]) => cls.studentIds?.includes(user.id))
        .map(([id]) => id);
      
      // Lọc từ examTemplates - chỉ lấy những đề đã active
      const studentExams = Object.entries(templatesData)
        .filter(([_, exam]) => {
          return exam.classIds?.some(classId => studentClasses.includes(classId)) &&
                 exam.status === 'active' &&
                 exam.startTime;
        })
        .map(([id, exam]) => ({ id, ...exam }))
        .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
      
      return studentExams;
    } catch (error) {
      console.error('Error getting student exams:', error);
      return [];
    }
  };

  const loadExams = async () => {
    setLoading(true);
    try {
      const templatesData = await databaseService.read('examTemplates');
      if (templatesData) {
        const studentExams = await getStudentExams(templatesData);
        setExams(studentExams);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (startTime) => {
    if (!startTime) return 'Chưa có lịch';
    const now = Date.now();
    const diff = startTime - now;
    if (diff <= 0) return 'Đã bắt đầu';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
  };

  if (loading) return <Loading />;

  return (
    <div className="upcoming-exams">
      <h2 className="section-title">Bài thi sắp tới</h2>
      {exams.length === 0 ? (
        <Card>
          <p className="no-exams">Không có bài thi nào sắp tới</p>
        </Card>
      ) : (
        <div className="exams-grid">
          {exams.map(exam => (
            <Card key={exam.id} className="exam-card">
              <div className="exam-header">
                <h3>{exam.title}</h3>
                <span className="exam-subject">{exam.subject}</span>
              </div>
              <div className="exam-info">
                <p><strong>Thời gian làm bài:</strong> {exam.duration} phút</p>
                <p><strong>Số câu hỏi:</strong> {exam.questions?.length || 0}</p>
                {exam.startTime && (
                  <p><strong>Bắt đầu:</strong> {new Date(exam.startTime).toLocaleString('vi-VN')}</p>
                )}
              </div>
              <div className="exam-countdown">
                <span className="countdown-label">Còn lại:</span>
                <span className="countdown-value">{getTimeRemaining(exam.startTime)}</span>
              </div>
              {(exam.status === 'active' || (exam.status === 'scheduled' && exam.startTime && Date.now() >= exam.startTime)) && (
                <Button 
                  onClick={() => navigate(`/student/exam/${exam.id}`)}
                  className="w-full exam-button"
                >
                  {exam.status === 'active' ? 'Vào thi ngay' : 'Bắt đầu làm bài'}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

