import { useEffect, useState } from 'react';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import './Notifications.css';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const results = await databaseService.read('examResults');
        if (results) {
          const teacherNotifications = [];
          
          // Get teacher's exams
          const exams = await databaseService.read('exams');
          if (exams) {
            const teacherExams = Object.entries(exams)
              .filter(([_, exam]) => exam.teacherId === user.id)
              .map(([id]) => id);

            // Check for recently submitted exams
            for (const [examId, examResults] of Object.entries(results)) {
              if (teacherExams.includes(examId)) {
                const resultsList = Object.values(examResults);
                const recentSubmissions = resultsList
                  .filter(result => {
                    const submittedAt = result.submittedAt || 0;
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    return submittedAt > fiveMinutesAgo;
                  })
                  .map(result => ({
                    examId,
                    studentId: result.studentId,
                    submittedAt: result.submittedAt
                  }));

                teacherNotifications.push(...recentSubmissions);
              }
            }
          }

          // Sort by most recent
          teacherNotifications.sort((a, b) => b.submittedAt - a.submittedAt);
          setNotifications(teacherNotifications.slice(0, 10)); // Last 10
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
    
    // Realtime listener
    const unsubscribe = databaseService.subscribe('examResults', (results) => {
      if (results && user) {
        loadNotifications();
      }
    });

    return unsubscribe;
  }, [user]);

  const getStudentName = async (studentId) => {
    try {
      const user = await databaseService.read(`users/${studentId}`);
      return user?.profile?.fullName || studentId;
    } catch {
      return studentId;
    }
  };

  const getExamTitle = async (examId) => {
    try {
      const exam = await databaseService.read(`exams/${examId}`);
      return exam?.title || 'Đề thi';
    } catch {
      return 'Đề thi';
    }
  };

  if (loading) return <Loading />;

  return (
    <Card>
      <h2>Thông báo</h2>
      {notifications.length === 0 ? (
        <p className="no-notifications">Không có thông báo mới</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((notif, index) => (
            <NotificationItem
              key={index}
              notification={notif}
              getStudentName={getStudentName}
              getExamTitle={getExamTitle}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function NotificationItem({ notification, getStudentName, getExamTitle }) {
  const [studentName, setStudentName] = useState('');
  const [examTitle, setExamTitle] = useState('');

  useEffect(() => {
    getStudentName(notification.studentId).then(setStudentName);
    getExamTitle(notification.examId).then(setExamTitle);
  }, [notification]);

  const timeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  return (
    <div className="notification-item">
      <div className="notification-icon">🔔</div>
      <div className="notification-content">
        <p>
          <strong>{studentName}</strong> vừa hoàn thành bài thi <strong>{examTitle}</strong>
        </p>
        <span className="notification-time">{timeAgo(notification.submittedAt)}</span>
      </div>
    </div>
  );
}
