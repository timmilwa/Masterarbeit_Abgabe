import React from 'react';
import { ReflectionLevel } from '../types';

interface ContextSelectorProps {
  currentLevel: ReflectionLevel;
  onSelect: (level: ReflectionLevel) => void;
  disabled: boolean;
}

const ContextSelector: React.FC<ContextSelectorProps> = ({ currentLevel, onSelect, disabled }) => {
  
  const getButtonClass = (level: ReflectionLevel) => {
    const baseClass = "flex-1 py-2 px-1 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 border focus:outline-none focus:ring-1 focus:ring-offset-1 text-center";
    
    if (disabled) {
      return `${baseClass} bg-gray-50 text-gray-400 border-transparent cursor-not-allowed`;
    }

    if (currentLevel === level) {
      switch (level) {
        case ReflectionLevel.FUNCTIONAL:
          return `${baseClass} bg-blue-100 text-blue-900 border-blue-400 shadow-sm`;
        case ReflectionLevel.EMOTIONAL:
          return `${baseClass} bg-rose-100 text-rose-900 border-rose-400 shadow-sm`;
        case ReflectionLevel.SYMBOLIC:
          return `${baseClass} bg-purple-100 text-purple-900 border-purple-400 shadow-sm`;
      }
    }

    return `${baseClass} bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50`;
  };

  return (
    <div className="flex flex-col space-y-1 w-full">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reflexions-Ebene</label>
      <div className="flex space-x-2 w-full">
        {Object.values(ReflectionLevel).map((level) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            disabled={disabled}
            className={getButtonClass(level)}
            title={level}
          >
            {/* Emojis removed as visual signal of update */}
            <span>{level}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContextSelector;