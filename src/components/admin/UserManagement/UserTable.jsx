import Button from '../../common/Button';
import './UserTable.css';

export default function UserTable({ users, role, classes, onEdit, onDelete }) {
  if (users.length === 0) {
    return <p className="no-users">Không có người dùng nào</p>;
  }

  // Lấy danh sách lớp của giáo viên
  const getTeacherClasses = (teacherId) => {
    return classes.filter(cls => cls.teacherId === teacherId);
  };

  return (
    <table className="user-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Họ tên</th>
          {role === 'student' && <th>Lớp</th>}
          {role === 'teacher' && <th>Lớp quản lý</th>}
          <th>SĐT</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => {
          const teacherClasses = role === 'teacher' ? getTeacherClasses(user.id) : [];
          return (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.profile?.fullName || '-'}</td>
              {role === 'student' && <td>{user.profile?.class || '-'}</td>}
              {role === 'teacher' && (
                <td>
                  {teacherClasses.length > 0 ? (
                    <div className="teacher-classes">
                      {teacherClasses.map(cls => (
                        <span key={cls.id} className="class-badge">
                          {cls.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>Chưa có lớp</span>
                  )}
                </td>
              )}
              <td>{user.profile?.phone || '-'}</td>
              <td>
                <div className="table-actions">
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(user)}
                    className="btn-small"
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onDelete(user.id)}
                    className="btn-small btn-danger"
                  >
                    Xóa
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

