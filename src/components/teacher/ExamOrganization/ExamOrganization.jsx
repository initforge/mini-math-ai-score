import { useState, useEffect } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Modal from '../../common/Modal';
import Loading from '../../common/Loading';
import ConfirmModal from '../../common/ConfirmModal';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import ExamList from './ExamList';
import CreateExamRoom from './CreateExamRoom';
import ActiveExamMonitor from './ActiveExamMonitor';
import './ExamOrganization.css';

export default function ExamOrganization() {
  const { user } = useAuth();
  const [examTemplates, setExamTemplates] = useState([]); // Đề thi trong kho đề thi - NGUỒN CHUNG
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    if (!user) return;

    loadExamTemplates();
    
    // Chỉ subscribe examTemplates - nguồn chung
    const unsubscribeTemplates = databaseService.subscribe('examTemplates', (templatesData) => {
      if (templatesData && user) {
        const teacherTemplates = Object.entries(templatesData)
          .map(([id, template]) => ({ id, ...template }))
          .filter(template => 
            template.createdBy === user.id &&
            // CHỈ HIỂN THỊ ĐỀ ĐÃ TẠO PHÒNG THI
            template.status && 
            template.status !== 'draft' &&
            template.startTime &&
            (template.endTime || template.noEndTime === true)
          );
        setExamTemplates(teacherTemplates);
      } else {
        setExamTemplates([]);
      }
    });

    return () => {
      unsubscribeTemplates();
    };
  }, [user]);

  const loadExamTemplates = async () => {
    setLoading(true);
    try {
      const templatesData = await databaseService.read('examTemplates');
      if (templatesData && user) {
        const teacherTemplates = Object.entries(templatesData)
          .map(([id, template]) => ({ id, ...template }))
          .filter(template => 
            template.createdBy === user.id &&
            // CHỈ HIỂN THỊ ĐỀ ĐÃ TẠO PHÒNG THI (có lịch)
            template.status && 
            template.status !== 'draft' &&
            template.startTime &&
            (template.endTime || template.noEndTime === true)
          );
        setExamTemplates(teacherTemplates);
      }
    } catch (error) {
      console.error('Error loading exam templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động cập nhật trạng thái kỳ thi theo thời gian hiện tại
  useEffect(() => {
    if (!user || !examTemplates || examTemplates.length === 0) return;

    const updateStatuses = async () => {
      const now = Date.now();

      const updates = examTemplates
        .filter(exam => typeof exam.startTime === 'number' && typeof exam.endTime === 'number')
        .map(exam => {
          let newStatus = exam.status;

          if (now < exam.startTime) {
            newStatus = 'scheduled';
          } else if (now >= exam.startTime && now < exam.endTime) {
            newStatus = 'active';
          } else if (now >= exam.endTime) {
            newStatus = 'completed';
          }

          if (newStatus !== exam.status) {
            return { id: exam.id, status: newStatus };
          }
          return null;
        })
        .filter(Boolean);

      try {
        await Promise.all(
          updates.map(u => databaseService.update(`examTemplates/${u.id}`, { status: u.status }))
        );
      } catch (error) {
        console.error('[ExamOrganization] Error auto-updating exam statuses:', error);
      }
    };

    // Chạy ngay khi mount / dữ liệu thay đổi
    updateStatuses();

    // Sau đó chạy định kỳ mỗi 30 giây
    const intervalId = setInterval(updateStatuses, 30000);
    return () => clearInterval(intervalId);
  }, [user, examTemplates]);

  const handleEdit = (exam) => {
    setSelectedExam(exam);
    setShowEditModal(true);
  };

  const handleDeleteClick = (exam) => {
    setSelectedExam(exam);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExam) return;
    
    try {
      // Xóa lịch thi bằng cách reset về draft và xóa các thông tin lịch
      await databaseService.update(`examTemplates/${selectedExam.id}`, {
        status: 'draft',
        startTime: null,
        endTime: null,
        classIds: [],
        duration: selectedExam.duration || 60 // Giữ lại duration gốc
      });
      
      loadExamTemplates();
      setShowDeleteModal(false);
      setSelectedExam(null);
    } catch (error) {
      console.error('Error deleting exam schedule:', error);
      alert('Lỗi khi xóa lịch thi');
    }
  };

  return (
    <Layout>
      <div className="exam-organization">
        <div className="page-header-wrapper">
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
              <div style={{ flex: 1 }}>
                <PageHeader 
                  title="Tổ chức thi"
                  subtitle="Quản lý và theo dõi các kỳ thi"
                />
              </div>
              <Button 
                variant="action" 
                onClick={() => setShowCreateModal(true)}
                className="create-exam-btn"
              >
                <span className="btn-icon">+</span>
                Tạo phòng thi
              </Button>
            </div>
          </div>
        </div>
        <div className="page-container">
          {loading ? (
            <Loading />
          ) : (
            <ExamList 
              exams={examTemplates} 
              onRefresh={loadExamTemplates}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          )}

          <Modal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            title="Tạo phòng thi"
          >
            <CreateExamRoom
              onSuccess={() => {
                setShowCreateModal(false);
                loadExamTemplates();
              }}
            />
          </Modal>

          <Modal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedExam(null);
            }}
            title="Sửa lịch thi"
          >
            {selectedExam && (
              <CreateExamRoom
                examToEdit={selectedExam}
                onSuccess={() => {
                  setShowEditModal(false);
                  setSelectedExam(null);
                  loadExamTemplates();
                }}
              />
            )}
          </Modal>

          <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedExam(null);
            }}
            onConfirm={handleDeleteConfirm}
            title="Xóa lịch thi"
            message={`Bạn có chắc chắn muốn xóa lịch thi "${selectedExam?.title}"? Hành động này không thể hoàn tác.`}
            confirmText="Xóa"
            cancelText="Hủy"
            variant="danger"
          />
        </div>
      </div>
    </Layout>
  );
}
