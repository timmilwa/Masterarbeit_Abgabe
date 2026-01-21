
import React from 'react';

interface LoaderProps {
  status: string;
}

export const Loader: React.FC<LoaderProps> = ({ status }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="text-blue-600 font-medium animate-pulse">{status}...</p>
    </div>
  );
};
