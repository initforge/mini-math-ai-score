import { useState, useEffect } from 'react';
import Layout from '../../common/Layout';
import PageHeader from '../../common/PageHeader';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Modal from '../../common/Modal';
import Loading from '../../common/Loading';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../hooks/useConfirm';
import ExamCardList from './ExamCardList';
import ExamForm from './ExamForm';
import './ExamBank.css';

export default function ExamBank() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [exams, setExams] = useState([]);
  const [publicExams, setPublicExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' hoặc 'public'

  useEffect(() => {
    if (!user) return;

    loadExams();
    
    const unsubscribe = databaseService.subscribe('examTemplates', (examsData) => {
      if (examsData && user) {
        const examsList = Object.entries(examsData)
          .map(([id, exam]) => ({ id, ...exam }));
        
        const myExams = examsList.filter(exam => exam.createdBy === user.id);
        const publicExamsList = examsList.filter(exam => exam.isPublic === true);
        
        setExams(myExams);
        setPublicExams(publicExamsList);
      } else {
        setExams([]);
        setPublicExams([]);
      }
    });

    return unsubscribe;
  }, [user]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const examsData = await databaseService.read('examTemplates');
      if (examsData && user) {
        const examsList = Object.entries(examsData)
          .map(([id, exam]) => ({ id, ...exam }));
        
        const myExams = examsList.filter(exam => exam.createdBy === user.id);
        const publicExamsList = examsList.filter(exam => exam.isPublic === true);
        
        setExams(myExams);
        setPublicExams(publicExamsList);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingExam(null);
    setIsModalOpen(true);
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setIsModalOpen(true);
  };

  const handleDelete = async (examId) => {
    const confirmed = await confirm({
      title: 'Xóa đề thi',
      message: 'Bạn có chắc muốn xóa đề thi này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      await databaseService.delete(`examTemplates/${examId}`);
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Lỗi khi xóa đề thi');
    }
  };

  const handleTogglePublic = async (exam) => {
    try {
      await databaseService.update(`examTemplates/${exam.id}`, {
        ...exam,
        isPublic: !exam.isPublic
      });
    } catch (error) {
      console.error('Error toggling public status:', error);
      alert('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingExam(null);
    loadExams();
  };

  const currentExams = activeTab === 'my' ? exams : publicExams;

  return (
    <Layout>
      <div className="exam-bank">
        <div className="page-header-wrapper">
          <div className="page-container">
            <PageHeader 
              title="Kho Đề Thi"
              subtitle="Quản lý và chia sẻ đề thi"
            />
          </div>
        </div>
        <div className="page-container">
          <div className="exam-tabs">
            <button
              className={`exam-tab ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => setActiveTab('my')}
            >
              Đề thi của tôi
            </button>
            <button
              className={`exam-tab ${activeTab === 'public' ? 'active' : ''}`}
              onClick={() => setActiveTab('public')}
            >
              Kho đề thi chung
            </button>
          </div>

          <Card>
            {loading ? (
              <Loading />
            ) : (
              <ExamCardList
                exams={currentExams}
                activeTab={activeTab}
                onEdit={activeTab === 'my' ? handleEdit : null}
                onDelete={activeTab === 'my' ? handleDelete : null}
                onTogglePublic={activeTab === 'my' ? handleTogglePublic : null}
                currentUserId={user?.id}
              />
            )}
          </Card>

          {activeTab === 'my' && (
            <Modal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingExam(null);
              }}
              title={editingExam ? 'Sửa đề thi' : 'Thêm đề thi mới'}
            >
              <ExamForm
                exam={editingExam}
                teacherId={user?.id}
                onSuccess={handleSuccess}
              />
            </Modal>
          )}
          <ConfirmDialog />
        </div>
      </div>
    </Layout>
  );
}

