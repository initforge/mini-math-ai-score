import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../common/Card';
import Button from '../../common/Button';
import { databaseService } from '../../../services/database';
import './ResultsTable.css';

export default function ResultsTable({ results, getGrade, examId }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState({});

  useEffect(() => {
    const loadStudents = async () => {
      const studentsData = {};
      for (const result of results) {
        try {
          const user = await databaseService.read(`users/${result.studentId}`);
          if (user) {
            studentsData[result.studentId] = user;
          }
        } catch (error) {
          console.error('Error loading student:', error);
        }
      }
      setStudents(studentsData);
    };

    if (results.length > 0) {
      loadStudents();
    }
  }, [results]);

  if (results.length === 0) {
    return <p className="no-results">Không có kết quả nào</p>;
  }

  const handleViewDetail = (studentId) => {
    navigate(`/teacher/results/${examId}/${studentId}`);
  };

  return (
    <Card className="results-table-card">
      <table className="results-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Username</th>
            <th>Lớp</th>
            <th>Điểm</th>
            <th>Xếp loại</th>
            <th>Thời gian nộp</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const student = students[result.studentId];
            return (
              <tr key={result.studentId}>
                <td>{index + 1}</td>
                <td>{student?.profile?.fullName || result.studentId}</td>
                <td className="username-cell">{student?.username || '-'}</td>
                <td>{student?.profile?.class || '-'}</td>
                <td>
                  <strong>{result.score}</strong> / {result.maxScore}
                </td>
                <td>
                  <span className={`grade-badge grade-${getGrade(result.score, result.maxScore).toLowerCase().replace(' ', '-')}`}>
                    {getGrade(result.score, result.maxScore)}
                  </span>
                </td>
                <td>
                  {result.submittedAt 
                    ? new Date(result.submittedAt).toLocaleString('vi-VN')
                    : '-'
                  }
                </td>
                <td>
                  <Button
                    variant="action"
                    size="small"
                    onClick={() => handleViewDetail(result.studentId)}
                  >
                    Xem chi tiết
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

