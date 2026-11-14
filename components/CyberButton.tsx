import React from 'react';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const CyberButton: React.FC<CyberButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  loading = false,
  ...buttonProps
}) => {
  const baseStyles = "relative px-6 py-3 font-bold font-mono uppercase tracking-widest text-sm transition-all duration-200 clip-corner focus:outline-none";
  
  const variants = {
    primary: "bg-cyber-yellow text-cyber-black hover:bg-white border-2 border-transparent",
    secondary: "bg-transparent text-cyber-cyan border-2 border-cyber-cyan hover:bg-cyber-cyan/10",
    danger: "bg-cyber-red text-white hover:bg-red-600"
  };

  return (
    <button 
      {...buttonProps}
      onClick={onClick} 
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'glitch-hover'} ${className}`}
    >
      {/* Decorative lines */}
      <span className="absolute top-0 right-0 w-2 h-2 bg-current opacity-50"></span>
      <span className="absolute bottom-0 left-0 w-2 h-2 bg-current opacity-50"></span>
      
      {loading ? "处理中…" : children}
    </button>
  );
};

export default CyberButton;
