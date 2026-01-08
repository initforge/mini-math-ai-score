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
import QuestionList from './QuestionList';
import QuestionForm from './QuestionForm';
import QuestionFilters from './QuestionFilters';
import './QuestionBank.css';

export default function QuestionBank() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: '',
    type: ''
  });

  useEffect(() => {
    if (!user) return;

    loadQuestions();
    
    const unsubscribe = databaseService.subscribe('questions', (questionsData) => {
      if (questionsData) {
        const teacherQuestions = Object.entries(questionsData)
          .map(([id, q]) => ({ id, ...q }))
          .filter(q => q.createdBy === user.id);
        setQuestions(teacherQuestions);
        applyFilters(teacherQuestions, filters);
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    applyFilters(questions, filters);
  }, [filters, questions]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const questionsData = await databaseService.read('questions');
      if (questionsData && user) {
        const teacherQuestions = Object.entries(questionsData)
          .map(([id, q]) => ({ id, ...q }))
          .filter(q => q.createdBy === user.id);
        setQuestions(teacherQuestions);
        applyFilters(teacherQuestions, filters);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (questionsList, currentFilters) => {
    let filtered = [...questionsList];
    
    if (currentFilters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === currentFilters.difficulty);
    }
    if (currentFilters.type) {
      filtered = filtered.filter(q => q.type === currentFilters.type);
    }
    
    setFilteredQuestions(filtered);
  };

  const handleAdd = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  const handleDelete = async (questionId) => {
    const confirmed = await confirm({
      title: 'Xóa câu hỏi',
      message: 'Bạn có chắc muốn xóa câu hỏi này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      await databaseService.delete(`questions/${questionId}`);
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Lỗi khi xóa câu hỏi');
    }
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
    loadQuestions();
  };

  return (
    <Layout>
      <div className="question-bank">
        <div className="page-header-wrapper">
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
              <div style={{ flex: 1 }}>
                <PageHeader 
                  title="Ngân hàng Câu hỏi"
                  subtitle="Quản lý và tổ chức câu hỏi thi"
                />
              </div>
              <Button 
                variant="action" 
                onClick={handleAdd}
                className="add-question-btn"
              >
                <span className="btn-icon">+</span>
                Thêm câu hỏi
              </Button>
            </div>
          </div>
        </div>
        <div className="page-container">

        <Card>
          <QuestionFilters
            filters={filters}
            onFilterChange={setFilters}
            questions={questions}
          />
        </Card>

        {loading ? (
          <Loading />
        ) : (
          <QuestionList
            questions={filteredQuestions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuestion(null);
          }}
          title={editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
        >
          <QuestionForm
            question={editingQuestion}
            teacherId={user?.id}
            onSuccess={handleSuccess}
          />
        </Modal>
        <ConfirmDialog />
        </div>
      </div>
    </Layout>
  );
}
