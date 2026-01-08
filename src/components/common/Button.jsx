import './Button.css';

export default function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false,
  type = 'button',
  className = '',
  ...props 
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

