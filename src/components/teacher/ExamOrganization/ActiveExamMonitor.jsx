import { useEffect, useState } from 'react';
import Card from '../../common/Card';
import { databaseService } from '../../../services/database';
import './ActiveExamMonitor.css';

export default function ActiveExamMonitor({ exams }) {
  const [sessions, setSessions] = useState({});

  useEffect(() => {
    const activeExams = exams.filter(e => e.status === 'active');
    
    const unsubscribes = activeExams.map(exam => {
      return databaseService.subscribe(`examSessions/${exam.id}`, (sessionsData) => {
        setSessions(prev => ({
          ...prev,
          [exam.id]: sessionsData || {}
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub && unsub());
    };
  }, [exams]);

  const getStudentInfo = async (studentId) => {
    try {
      const user = await databaseService.read(`users/${studentId}`);
      return user?.profile?.fullName || studentId;
    } catch {
      return studentId;
    }
  };

  if (exams.length === 0) {
    return (
      <Card>
        <p className="no-active">Không có đề thi nào đang diễn ra</p>
      </Card>
    );
  }

  return (
    <div className="active-exam-monitor">
      {exams.map(exam => {
        const examSessions = sessions[exam.id] || {};
        const sessionList = Object.entries(examSessions);

        return (
          <Card key={exam.id} className="monitor-card">
            <h3>{exam.title}</h3>
            <div className="sessions-table">
              <table>
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Trạng thái</th>
                    <th>Thời gian còn lại</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionList.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="no-sessions">
                        Chưa có học sinh nào bắt đầu làm bài
                      </td>
                    </tr>
                  ) : (
                    sessionList.map(([studentId, session]) => (
                      <tr key={studentId}>
                        <td>{studentId}</td>
                        <td>
                          <span className={`status-badge ${session.status === 'submitted' ? 'submitted' : 'in-progress'}`}>
                            {session.status === 'submitted' ? 'Đã nộp' : 'Đang thi'}
                          </span>
                        </td>
                        <td>
                          {session.status === 'submitted' 
                            ? 'Đã nộp'
                            : exam.endTime 
                              ? `${Math.max(0, Math.floor((exam.endTime - Date.now()) / 60000))} phút`
                              : '-'
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

