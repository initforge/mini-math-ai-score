import { useState, useEffect } from 'react';
import Card from '../../common/Card';
import Button from '../../common/Button';
import { databaseService } from '../../../services/database';
import { excelService } from '../../../services/excel';
import { useConfirm } from '../../../hooks/useConfirm';
import StudentList from './StudentList';
import './ClassList.css';

export default function ClassList({ classes, selectedClass, onSelectClass, onClassDeleted }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  const loadStudents = async () => {
    if (!selectedClass?.studentIds) return;
    setLoading(true);
    try {
      const users = await databaseService.read('users');
      if (users) {
        const classStudents = selectedClass.studentIds
          .map(id => {
            const user = Object.entries(users).find(([uid]) => uid === id);
            return user ? { id: user[0], ...user[1] } : null;
          })
          .filter(Boolean);
        setStudents(classStudents);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (students.length === 0) {
      alert('Không có học sinh để xuất');
      return;
    }

    const exportData = students.map(student => ({
      fullName: student.profile?.fullName || '',
      username: student.username || '',
      password: student.password || '',
      className: selectedClass.name
    }));

    excelService.exportStudents(exportData, `danh_sach_${selectedClass.name}.xlsx`);
  };

  const handleDeleteClass = async (classId, className) => {
    const confirmed = await confirm({
      title: 'Xóa lớp',
      message: `Bạn có chắc muốn xóa lớp "${className}"? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp này.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    
    if (!confirmed) return;

    try {
      // Clear selection trước khi xóa
      if (selectedClass?.id === classId) {
        onSelectClass(null);
      }
      
      // Xóa lớp khỏi profile của học sinh trước
      const users = await databaseService.read('users');
      if (users) {
        const updatePromises = [];
        for (const [userId, user] of Object.entries(users)) {
          if (user.profile?.class === className) {
            updatePromises.push(
              databaseService.update(`users/${userId}/profile`, {
                ...user.profile,
                class: ''
              })
            );
          }
        }
        await Promise.all(updatePromises);
      }
      
      // Xóa lớp - subscribe sẽ tự động cập nhật UI
      await databaseService.delete(`classes/${classId}`);
      
      // Callback để đảm bảo parent component cập nhật
      if (onClassDeleted) {
        onClassDeleted();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Lỗi khi xóa lớp');
    }
  };

  if (classes.length === 0) {
    return (
      <Card>
        <p className="no-classes">Chưa có lớp học nào. Hãy import Excel để tạo lớp mới.</p>
      </Card>
    );
  }

  return (
    <div className="class-list-container">
      <div className="classes-sidebar">
        <Card>
          <h2>Danh sách lớp</h2>
          <div className="classes-list">
            {classes.map(cls => (
              <div
                key={cls.id}
                className={`class-item ${selectedClass?.id === cls.id ? 'active' : ''}`}
                onClick={() => onSelectClass(cls)}
              >
                <button
                  className="class-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(cls.id, cls.name);
                  }}
                  title="Xóa lớp"
                >
                  🗑️
                </button>
                <h3>{cls.name}</h3>
                <p>{cls.studentIds?.length || 0} học sinh</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="students-main">
        {selectedClass ? (
          <Card>
            <div className="students-header">
              <h2>Học sinh lớp {selectedClass.name}</h2>
              <Button onClick={handleExport}>Xuất Excel</Button>
            </div>
            {loading ? (
              <p>Đang tải...</p>
            ) : (
              <StudentList students={students} />
            )}
          </Card>
        ) : (
          <Card>
            <p className="select-class">Chọn một lớp để xem danh sách học sinh</p>
          </Card>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
}

