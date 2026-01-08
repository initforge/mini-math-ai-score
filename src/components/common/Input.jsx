import { useState } from 'react';
import './Input.css';

export default function Input({ 
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  className = '',
  showPasswordToggle = false,
  ...props 
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        <input
          type={inputType}
          className={`input ${error ? 'input-error' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={type === 'password' ? 'current-password' : props.autoComplete || 'off'}
          {...props}
        />
        {(isPassword && showPasswordToggle) && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}

