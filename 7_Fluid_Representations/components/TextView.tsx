
import React from 'react';

interface TextViewProps {
  text: string;
  onChange: (text: string) => void;
}

export const TextView: React.FC<TextViewProps> = ({ text, onChange }) => {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="bg-gray-100 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-200/50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Content Draft</h3>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Editable</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start typing or let AI generate content from another tab..."
          className="w-full h-[60vh] p-8 text-lg text-gray-800 leading-relaxed outline-none resize-none placeholder:text-gray-400 bg-gray-100"
        />
      </div>
    </div>
  );
};
