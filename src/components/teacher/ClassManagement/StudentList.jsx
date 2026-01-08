import './StudentList.css';

export default function StudentList({ students }) {
  if (students.length === 0) {
    return <p className="no-students">Lớp này chưa có học sinh</p>;
  }

  return (
    <table className="students-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Họ tên</th>
          <th>Username</th>
          <th>Lớp</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => (
          <tr key={student.id}>
            <td>{index + 1}</td>
            <td>{student.profile?.fullName || '-'}</td>
            <td>{student.username}</td>
            <td>{student.profile?.class || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

