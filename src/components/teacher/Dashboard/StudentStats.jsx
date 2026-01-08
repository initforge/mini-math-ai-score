import { useEffect, useState } from 'react';
import Card from '../../common/Card';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import './StudentStats.css';

export default function StudentStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsByClass: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        // Lấy tất cả lớp của giáo viên
        const classesData = await databaseService.read('classes');
        const teacherClasses = classesData ? Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }))
          .filter(cls => cls.teacherId === user.id) : [];

        // Đếm học sinh theo lớp - dựa trên studentIds của lớp (chính xác từ database)
        const studentsByClass = {};
        let totalStudentIds = new Set(); // Dùng Set để tránh đếm trùng

        teacherClasses.forEach(cls => {
          // Đếm dựa trên studentIds của lớp (chính xác từ database)
          const classStudentCount = cls.studentIds && Array.isArray(cls.studentIds) 
            ? cls.studentIds.length 
            : 0;
          
          studentsByClass[cls.name] = classStudentCount;
          
          // Thêm tất cả studentIds vào Set để đếm tổng unique
          if (cls.studentIds && Array.isArray(cls.studentIds)) {
            cls.studentIds.forEach(id => totalStudentIds.add(id));
          }
        });

        setStats({
          totalStudents: totalStudentIds.size, // Tổng số học sinh unique
          studentsByClass
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    const unsubscribe = databaseService.subscribe('users', () => {
      loadStats();
    });

    const unsubscribeClasses = databaseService.subscribe('classes', () => {
      loadStats();
    });

    return () => {
      unsubscribe();
      unsubscribeClasses();
    };
  }, [user]);

  if (loading) return <Loading />;

  return (
    <Card className="student-stats-card">
      <h2>Thống kê học sinh</h2>
      <div className="stats-content">
        <div className="stat-item total">
          <div className="stat-value">{stats.totalStudents}</div>
          <div className="stat-label">Tổng số học sinh</div>
        </div>
        <div className="stats-by-class">
          {Object.keys(stats.studentsByClass).length > 0 ? (
            Object.entries(stats.studentsByClass).map(([className, count]) => (
              <div key={className} className="class-stat-item">
                <span className="class-name">{className}</span>
                <span className="class-count">{count} học sinh</span>
              </div>
            ))
          ) : (
            <p className="no-classes">Chưa có lớp nào</p>
          )}
        </div>
      </div>
    </Card>
  );
}


