
import React from 'react';
import { StickyNote } from '../types';

interface NotesViewProps {
  notes: StickyNote[];
  onUpdate: (notes: StickyNote[]) => void;
}

const Note: React.FC<{ note: StickyNote }> = ({ note }) => {
  return (
    <div 
      className={`p-4 rounded-sm shadow-lg border-l-4 border-black/5 ${note.color || 'bg-yellow-100'} 
        transition-all hover:-translate-y-1 hover:shadow-xl cursor-default w-56 flex-shrink-0 
        relative overflow-hidden m-2 transform rotate-1`}
      style={{ boxShadow: '2px 3px 10px rgba(0,0,0,0.1)' }}
    >
      <div className="absolute top-0 right-0 w-8 h-8 bg-white/30 rotate-45 translate-x-5 -translate-y-5"></div>
      <h4 className="font-bold text-gray-900 mb-2 border-b border-black/10 pb-1 text-sm leading-tight uppercase tracking-tight">
        {note.title}
      </h4>
      <p className="text-xs text-gray-800 leading-normal font-medium opacity-90">
        {note.content}
      </p>
    </div>
  );
};

const TreeNode: React.FC<{ note: StickyNote }> = ({ note }) => {
  const hasChildren = note.children && note.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <Note note={note} />
      
      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical line from parent to bridge */}
          <div className="w-0.5 h-8 bg-gray-300"></div>
          
          {/* Horizontal bridge connecting all children */}
          <div className="relative flex justify-center">
            {note.children!.length > 1 && (
              <div className="absolute top-0 h-0.5 bg-gray-300" 
                   style={{ 
                     left: 'calc(100% / ' + (note.children!.length * 2) + ')', 
                     right: 'calc(100% / ' + (note.children!.length * 2) + ')' 
                   }}
              ></div>
            )}
            
            <div className="flex gap-4">
              {note.children!.map((child, idx) => (
                <div key={child.id || idx} className="flex flex-col items-center">
                  {/* Vertical line from bridge to child */}
                  <div className="w-0.5 h-4 bg-gray-300"></div>
                  <TreeNode note={child} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const NotesView: React.FC<NotesViewProps> = ({ notes }) => {
  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 backdrop-blur-sm">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-400 font-medium text-center">Empty workspace.<br/>Generate notes from other media types to see the structure.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-32 pt-12 animate-fade-in scrollbar-hide">
      <div className="inline-block min-w-full px-12">
        <div className="flex justify-center gap-12 items-start">
          {notes.map((rootNote, idx) => (
            <TreeNode key={rootNote.id || idx} note={rootNote} />
          ))}
        </div>
      </div>
    </div>
  );
};
