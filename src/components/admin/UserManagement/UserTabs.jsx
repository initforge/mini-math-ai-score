import { useState, useEffect } from 'react';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Modal from '../../common/Modal';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import UserTable from './UserTable';
import UserForm from './UserForm';
import './UserTabs.css';

export default function UserTabs({ activeTab, setActiveTab }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all'); // 'all' hoặc className
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadUsers();
    loadClasses();
    
    const unsubscribe = databaseService.subscribe('users', (usersData) => {
      if (usersData) {
        const usersList = Object.entries(usersData)
          .map(([id, user]) => ({ id, ...user }))
          .filter(user => user.role === activeTab);
        setUsers(usersList);
      }
    });

    const unsubscribeClasses = databaseService.subscribe('classes', (classesData) => {
      if (classesData) {
        const classesList = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }));
        setClasses(classesList);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeClasses();
    };
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await databaseService.read('users');
      if (usersData) {
        const usersList = Object.entries(usersData)
          .map(([id, user]) => ({ id, ...user }))
          .filter(user => user.role === activeTab);
        setUsers(usersList);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const classesData = await databaseService.read('classes');
      if (classesData) {
        const classesList = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }));
        setClasses(classesList);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (window.confirm(`Bạn có chắc muốn xóa lớp "${className}"? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp.`)) {
      try {
        // Xóa lớp
        await databaseService.delete(`classes/${classId}`);
        // Cập nhật học sinh: xóa class khỏi profile
        const usersData = await databaseService.read('users');
        if (usersData) {
          for (const [userId, user] of Object.entries(usersData)) {
            if (user.profile?.class === className) {
              await databaseService.update(`users/${userId}/profile`, {
                ...user.profile,
                class: ''
              });
            }
          }
        }
        alert('Đã xóa lớp thành công');
      } catch (error) {
        console.error('Error deleting class:', error);
        alert('Lỗi khi xóa lớp');
      }
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      try {
        await databaseService.delete(`users/${userId}`);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Lỗi khi xóa người dùng');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      user.profile?.fullName?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower)
    );
    
    // Lọc theo lớp (chỉ cho học sinh)
    if (activeTab === 'student' && selectedClass !== 'all') {
      return matchesSearch && user.profile?.class === selectedClass;
    }
    
    return matchesSearch;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="user-tabs">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === 'teacher' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('teacher');
            setCurrentPage(1);
            setSearchTerm('');
          }}
        >
          Giáo viên
        </button>
        <button
          className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('student');
            setCurrentPage(1);
            setSearchTerm('');
          }}
        >
          Học sinh
        </button>
      </div>

      <Card className="users-content">
        <div className="users-header">
          {activeTab === 'student' && (
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="class-select"
            >
              <option value="all">Tất cả lớp</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}
          <Input
            placeholder="Tìm kiếm theo tên hoặc username..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
          {activeTab === 'student' && selectedClass !== 'all' && (
            <Button
              variant="secondary"
              onClick={() => {
                const classToDelete = classes.find(c => c.name === selectedClass);
                if (classToDelete) {
                  handleDeleteClass(classToDelete.id, selectedClass);
                }
              }}
              className="btn-danger"
            >
              Xóa lớp
            </Button>
          )}
          <Button onClick={handleAdd}>+ Thêm {activeTab === 'teacher' ? 'Giáo viên' : 'Học sinh'}</Button>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <>
            <UserTable
              users={paginatedUsers}
              role={activeTab}
              classes={classes}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            
            {totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Trước
                </Button>
                <span className="page-info">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Sửa người dùng' : `Thêm ${activeTab === 'teacher' ? 'giáo viên' : 'học sinh'}`}
      >
        <UserForm
          user={editingUser}
          role={activeTab}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      </Modal>
    </div>
  );
}

