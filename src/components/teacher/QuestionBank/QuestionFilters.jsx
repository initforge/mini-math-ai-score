import Input from '../../common/Input';
import './QuestionFilters.css';

const difficulties = ['easy', 'medium', 'hard'];
const types = [
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'true_false', label: 'Đúng/Sai' },
  { value: 'short_answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' }
];

export default function QuestionFilters({ filters, onFilterChange, questions }) {
  return (
    <div className="question-filters">
      <div className="filters-grid">
        <div className="filter-item">
          <label>Độ khó</label>
          <select
            value={filters.difficulty}
            onChange={(e) => onFilterChange({ ...filters, difficulty: e.target.value })}
            className="filter-select"
          >
            <option value="">Tất cả</option>
            {difficulties.map(diff => (
              <option key={diff} value={diff}>
                {diff === 'easy' ? 'Dễ' : diff === 'medium' ? 'Trung bình' : 'Khó'}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Loại</label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
            className="filter-select"
          >
            <option value="">Tất cả</option>
            {types.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="filter-reset">
        <button
          className="reset-button"
          onClick={() => onFilterChange({ difficulty: '', type: '' })}
        >
          Xóa bộ lọc
        </button>
        <span className="filter-count">
          {questions.length} câu hỏi
        </span>
      </div>
    </div>
  );
}

