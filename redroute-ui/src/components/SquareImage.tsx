import React from 'react';

interface SquareImageProps {
  size?: number;
  color?: string;
  className?: string;
}

const SquareImage: React.FC<SquareImageProps> = ({ 
  size = 200, 
  color = '#3b82f6', 
  className = '' 
}) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <span className="text-white font-bold text-lg">
        SQUARE
      </span>
    </div>
  );
};

export default SquareImage;

