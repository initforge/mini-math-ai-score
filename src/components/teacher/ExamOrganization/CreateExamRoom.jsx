import { useState, useEffect } from 'react';
import Button from '../../common/Button';
import Input from '../../common/Input';
import SearchableSelect from '../../common/SearchableSelect';
import { databaseService } from '../../../services/database';
import { logService } from '../../../services/logService';
import { useAuth } from '../../../contexts/AuthContext';
import './CreateExamRoom.css';

export default function CreateExamRoom({ onSuccess, examToEdit }) {
  const { user } = useAuth();
  const isEditMode = !!examToEdit;
  
  const [formData, setFormData] = useState({
    examId: '',
    classIds: [],
    duration: 60
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load TẤT CẢ đề thi của teacher (kể cả draft) để chọn
  const [availableExams, setAvailableExams] = useState([]);
  
  useEffect(() => {
    const loadAvailableExams = async () => {
      try {
        const templatesData = await databaseService.read('examTemplates');
        if (templatesData && user) {
          const teacherExams = Object.entries(templatesData)
            .map(([id, template]) => ({ id, ...template }))
            .filter(template => template.createdBy === user.id); // Tất cả đề của teacher
          setAvailableExams(teacherExams);
        }
      } catch (error) {
        console.error('Error loading exams:', error);
      }
    };
    
    if (user) {
      loadAvailableExams();
    }
  }, [user]);

  // Load classes
  const [classes, setClasses] = useState([]);
  
  useEffect(() => {
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
    loadClasses();
  }, []);

  // Load exam data when editing
  useEffect(() => {
    if (examToEdit) {
      setFormData({
        examId: examToEdit.id,
        classIds: examToEdit.classIds || [],
        duration: examToEdit.duration || 60
      });
    }
  }, [examToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.examId) {
        setError('Vui lòng chọn đề thi');
        setLoading(false);
        return;
      }

      if (formData.classIds.length === 0) {
        setError('Vui lòng chọn ít nhất một lớp');
        setLoading(false);
        return;
      }

      // Đặt trạng thái scheduled với thông tin cơ bản
      // Không có thời gian bắt đầu/kết thúc - đề luôn sẵn sàng
      const updateData = {
        status: 'active', // Luôn active, không có scheduled
        classIds: formData.classIds,
        startTime: Date.now(), // Thời điểm tạo phòng
        endTime: null, // Không giới hạn thời gian
        noEndTime: true,
        duration: formData.duration
      };

      // Cập nhật vào examTemplates - nguồn chung
      await databaseService.update(`examTemplates/${formData.examId}`, updateData);

      // Ghi log giáo viên set lịch thi (chỉ khi tạo mới, không log khi edit)
      if (user && !isEditMode) {
        await logService.logTeacherScheduleExam(
          user.username,
          formData.examId,
          Date.now(),
          null,
          formData.classIds
        );
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating exam room:', error);
      setError('Lỗi khi tạo phòng thi');
    } finally {
      setLoading(false);
    }
  };

  const handleClassToggle = (classId) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="create-exam-room">
      <div className="form-group">
        <SearchableSelect
          label="Chọn đề thi"
          options={availableExams}
          value={formData.examId}
          onChange={(examId) => setFormData({ ...formData, examId })}
          placeholder="Chọn đề thi"
          searchPlaceholder="Tìm kiếm đề thi..."
          getOptionLabel={(exam) => exam.title}
          getOptionValue={(exam) => exam.id}
          required
          disabled={isEditMode}
        />
      </div>

      <div className="form-group">
        <label>Chọn lớp *</label>
        <div className="classes-checkbox">
          {classes.map(cls => (
            <label key={cls.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.classIds.includes(cls.id)}
                onChange={() => handleClassToggle(cls.id)}
              />
              <span>{cls.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <Input
          label="Thời gian làm bài (phút) *"
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
          min="1"
          required
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <Button type="submit" disabled={loading}>
          {loading ? (isEditMode ? 'Đang lưu...' : 'Đang tạo...') : (isEditMode ? 'Lưu thay đổi' : 'Tạo phòng thi')}
        </Button>
      </div>
    </form>
  );
}

