import { useState, useEffect } from 'react';
import { databaseService } from '../../../services/database';
import { useAuth } from '../../../contexts/AuthContext';
import Input from '../../common/Input';
import './ResultsFilters.css';

const scoreRanges = [
  { value: '', label: 'Tất cả' },
  { value: '0-5', label: '0 - 5 điểm' },
  { value: '5-7', label: '5 - 7 điểm' },
  { value: '7-8', label: '7 - 8 điểm' },
  { value: '8-10', label: '8 - 10 điểm' }
];

const grades = [
  { value: '', label: 'Tất cả' },
  { value: 'Yếu', label: 'Yếu' },
  { value: 'Trung bình', label: 'Trung bình' },
  { value: 'Khá', label: 'Khá' },
  { value: 'Giỏi', label: 'Giỏi' },
  { value: 'Xuất sắc', label: 'Xuất sắc' }
];

export default function ResultsFilters({ filters, onFilterChange }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    const loadClasses = async () => {
      try {
        const classesData = await databaseService.read('classes');
        if (classesData) {
          const teacherClasses = Object.entries(classesData)
            .map(([id, cls]) => ({ id, ...cls }))
            .filter(cls => cls.teacherId === user.id)
            .map(cls => cls.name);
          setClasses([...new Set(teacherClasses)]);
        }
      } catch (error) {
        console.error('Error loading classes:', error);
      }
    };
    
    loadClasses();
  }, [user]);
  return (
    <div className="results-filters">
      <div className="filters-grid">
        <div className="filter-item">
          <Input
            placeholder="Tìm kiếm theo tên..."
            value={filters.name}
            onChange={(e) => onFilterChange({ ...filters, name: e.target.value })}
            className="search-input"
          />
        </div>

        <div className="filter-item">
          <label>Lọc theo điểm</label>
          <select
            value={filters.scoreRange}
            onChange={(e) => onFilterChange({ ...filters, scoreRange: e.target.value })}
            className="filter-select"
          >
            {scoreRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>


        <div className="filter-item">
          <label>Lọc theo lớp</label>
          <select
            value={filters.className || ''}
            onChange={(e) => onFilterChange({ ...filters, className: e.target.value })}
            className="filter-select"
          >
            <option value="">Tất cả lớp</option>
            {classes.map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-reset">
        <button
          className="reset-button"
          onClick={() => onFilterChange({ name: '', scoreRange: '', className: '' })}
        >
          Xóa bộ lọc
        </button>
      </div>
    </div>
  );
}

