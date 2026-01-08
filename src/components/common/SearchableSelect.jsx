import { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';

export default function SearchableSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  getOptionLabel = (option) => option.label || option.title || option.name || String(option),
  getOptionValue = (option) => option.value || option.id || option,
  required = false,
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Đóng dropdown khi click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus vào input khi mở dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    const label = getOptionLabel(option).toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });

  const selectedOption = options.find(opt => getOptionValue(opt) === value);
  const displayValue = selectedOption ? getOptionLabel(selectedOption) : '';

  const handleSelect = (option) => {
    onChange(getOptionValue(option));
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`searchable-select-wrapper ${className}`} ref={wrapperRef}>
      {label && <label className="searchable-select-label">{label}{required && ' *'}</label>}
      <div 
        className={`searchable-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`searchable-select-value ${!value ? 'placeholder' : ''}`}>
          {displayValue || placeholder}
        </span>
        <span className="searchable-select-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search">
            <input
              ref={inputRef}
              type="text"
              className="searchable-select-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-no-results">Không tìm thấy kết quả</div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = optionValue === value;

                return (
                  <div
                    key={optionValue || index}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {optionLabel}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

