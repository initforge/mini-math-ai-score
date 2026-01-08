import { useState, useEffect } from 'react';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Modal from '../../common/Modal';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useConfirm } from '../../../hooks/useConfirm';
import UserTable from './UserTable';
import UserForm from './UserForm';
import './UserTabs.css';

export default function UserTabs({ activeTab, setActiveTab }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null); // null hoặc class object
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    loadUsers();
    loadClasses();
    
    const unsubscribe = databaseService.subscribe('users', (usersData) => {
      if (usersData) {
        const usersList = Object.entries(usersData)
          .map(([id, user]) => ({ id, ...user }))
          .filter(user => user.role === activeTab);
        setUsers(usersList);
        if (activeTab === 'student' && selectedClass) {
          loadStudentsForClass(selectedClass);
        }
      } else {
        setUsers([]);
      }
    });

    const unsubscribeClasses = databaseService.subscribe('classes', (classesData) => {
      // Handle cả trường hợp null/undefined (khi xóa hết classes)
      if (classesData) {
        const classesList = Object.entries(classesData)
          .map(([id, cls]) => ({ id, ...cls }));
        setClasses(classesList);
        
        // Nếu lớp đang chọn đã bị xóa, clear selection
        if (selectedClass && !classesList.find(c => c.id === selectedClass.id)) {
          setSelectedClass(null);
        }
      } else {
        // Nếu không còn classes nào, set empty array
        setClasses([]);
        if (selectedClass) {
          setSelectedClass(null);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeClasses();
    };
  }, [activeTab]); // Bỏ selectedClass khỏi dependency để tránh resubscribe không cần thiết

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
        
        // Nếu lớp đang chọn đã bị xóa, clear selection
        if (selectedClass && !classesList.find(c => c.id === selectedClass.id)) {
          setSelectedClass(null);
        }
      } else {
        setClasses([]);
        setSelectedClass(null);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudentsForClass = async (classObj) => {
    if (!classObj?.studentIds) {
      setStudents([]);
      return;
    }
    
    try {
      const users = await databaseService.read('users');
      if (users) {
        const classStudents = classObj.studentIds
          .map(id => {
            const user = Object.entries(users).find(([uid]) => uid === id);
            return user ? { id: user[0], ...user[1] } : null;
          })
          .filter(Boolean);
        setStudents(classStudents);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'student' && selectedClass) {
      loadStudentsForClass(selectedClass);
    } else if (activeTab === 'student') {
      setStudents([]);
    }
  }, [selectedClass, activeTab]);

  const handleDeleteClass = async (classId, className) => {
    const confirmed = await confirm({
      title: 'Xóa lớp',
      message: `Bạn có chắc muốn xóa lớp "${className}"? Tất cả học sinh trong lớp sẽ bị xóa khỏi lớp.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    
    if (!confirmed) return;

    try {
      // Clear selection trước khi xóa
      if (selectedClass?.id === classId) {
        setSelectedClass(null);
      }
      
      // Xóa lớp khỏi profile của học sinh trước
      const usersData = await databaseService.read('users');
      if (usersData) {
        const updatePromises = [];
        for (const [userId, user] of Object.entries(usersData)) {
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
      
      // Force reload để đảm bảo cập nhật
      loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Lỗi khi xóa lớp');
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
    const confirmed = await confirm({
      title: 'Xóa người dùng',
      message: 'Bạn có chắc muốn xóa người dùng này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      await databaseService.delete(`users/${userId}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Lỗi khi xóa người dùng');
    }
  };

  // Filter users based on search and class (for student tab)
  const filteredUsers = activeTab === 'student' && selectedClass
    ? students.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.profile?.fullName?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
        );
      })
    : users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          user.profile?.fullName?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
        );
        return matchesSearch;
      });

  // For teacher tab, show all teachers with their managed classes
  if (activeTab === 'teacher') {
    return (
      <div className="user-tabs">
        <div className="tabs-header">
          <button
            className={`tab-button ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('teacher');
              setSearchTerm('');
            }}
          >
            Giáo viên
          </button>
          <button
            className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('student');
              setSearchTerm('');
              setSelectedClass(null);
            }}
          >
            Học sinh
          </button>
        </div>

        <Card className="users-content">
          <div className="users-header">
            <Input
              placeholder="Tìm kiếm theo tên hoặc username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <Button onClick={handleAdd}>+ Thêm Giáo viên</Button>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <UserTable
              users={filteredUsers}
              role={activeTab}
              classes={classes}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          title={editingUser ? 'Sửa người dùng' : 'Thêm giáo viên'}
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
        <ConfirmDialog />
      </div>
    );
  }

  // For student tab, use ClassList layout
  return (
    <div className="user-tabs">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === 'teacher' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('teacher');
            setSearchTerm('');
          }}
        >
          Giáo viên
        </button>
        <button
          className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('student');
            setSearchTerm('');
            setSelectedClass(null);
          }}
        >
          Học sinh
        </button>
      </div>

      <div className="class-list-container">
        <div className="classes-sidebar">
          <Card>
            <h2>Danh sách lớp</h2>
            <div className="classes-list">
              {classes.length === 0 ? (
                <p className="no-classes">Chưa có lớp học nào</p>
              ) : (
                classes.map(cls => (
                  <div
                    key={cls.id}
                    className={`class-item ${selectedClass?.id === cls.id ? 'active' : ''}`}
                    onClick={() => setSelectedClass(cls)}
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
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="students-main">
          {selectedClass ? (
            <Card>
              <div className="students-header">
                <h2>Học sinh lớp {selectedClass.name}</h2>
                <div className="students-header-actions">
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <Button onClick={handleAdd}>+ Thêm Học sinh</Button>
                </div>
              </div>
              {loading ? (
                <Loading />
              ) : (
                <UserTable
                  users={filteredUsers}
                  role={activeTab}
                  classes={classes}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </Card>
          ) : (
            <Card>
              <p className="select-class">Chọn một lớp để xem danh sách học sinh</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Sửa người dùng' : 'Thêm học sinh'}
      >
        <UserForm
          user={editingUser}
          role={activeTab}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingUser(null);
            loadUsers();
            if (selectedClass) {
              loadStudentsForClass(selectedClass);
            }
          }}
        />
      </Modal>
      <ConfirmDialog />
    </div>
  );
}

