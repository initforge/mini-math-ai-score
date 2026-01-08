import { useEffect, useState } from 'react';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import './UpcomingExams.css';

export default function UpcomingExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadExams = async () => {
      try {
        // Query từ examTemplates (nguồn chung)
        const templatesData = await databaseService.read('examTemplates');
        if (templatesData) {
          const now = Date.now();
          const teacherExams = Object.entries(templatesData)
            .map(([id, exam]) => ({ id, ...exam }))
            .filter(exam => 
              exam.createdBy === user.id && 
              (exam.status === 'active' || exam.status === 'scheduled') &&
              exam.classIds && exam.classIds.length > 0 // Phải được gán lớp
            )
            .sort((a, b) => (a.startTime || now) - (b.startTime || now));
          
          // Load class names
          const classesData = await databaseService.read('classes');
          const teacherExamsWithClasses = teacherExams.map(exam => ({
            ...exam,
            classNames: exam.classIds?.map(classId => {
              const cls = classesData?.[classId];
              return cls?.name || classId;
            }) || []
          }));
          
          setExams(teacherExamsWithClasses);
        }
      } catch (error) {
        console.error('Error loading exams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExams();
    
    const unsubscribe = databaseService.subscribe('examTemplates', async (templatesData) => {
      if (templatesData && user) {
        const now = Date.now();
        const teacherExams = Object.entries(templatesData)
          .map(([id, exam]) => ({ id, ...exam }))
          .filter(exam => 
            exam.createdBy === user.id && 
            (exam.status === 'active' || exam.status === 'scheduled') &&
            exam.classIds && exam.classIds.length > 0
          )
          .sort((a, b) => (a.startTime || now) - (b.startTime || now));
        
        // Load class names
        const classesData = await databaseService.read('classes');
        const teacherExamsWithClasses = teacherExams.map(exam => ({
          ...exam,
          classNames: exam.classIds?.map(classId => {
            const cls = classesData?.[classId];
            return cls?.name || classId;
          }) || []
        }));
        
        setExams(teacherExamsWithClasses);
      }
    });

    return unsubscribe;
  }, [user]);

  const getTimeRemaining = (startTime) => {
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
    <Card>
      <h2>Lịch thi sắp tới của các lớp</h2>
      {exams.length === 0 ? (
        <p className="no-exams">Không có kỳ thi nào sắp tới</p>
      ) : (
        <div className="exams-list">
          {exams.map(exam => (
            <div key={exam.id} className="exam-card">
              <div className="exam-card-header">
                <h3>{exam.title}</h3>
                {exam.classNames && exam.classNames.length > 0 && (
                  <div className="class-tags">
                    {exam.classNames.map((className, idx) => (
                      <span key={idx} className="class-tag">{className}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="exam-info">
                <p><strong>Thời gian bắt đầu:</strong> {exam.startTime ? new Date(exam.startTime).toLocaleString('vi-VN') : 'Sẵn sàng ngay'}</p>
                <p><strong>Thời gian làm bài:</strong> {exam.duration} phút</p>
                <p><strong>Số câu hỏi:</strong> {exam.questions?.length || 0}</p>
                {exam.startTime && (
                  <p className="countdown">
                    <strong>Còn lại:</strong> {getTimeRemaining(exam.startTime)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

