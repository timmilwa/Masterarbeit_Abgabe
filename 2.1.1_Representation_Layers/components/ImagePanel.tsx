import React, { ChangeEvent, useRef } from 'react';
import { ImageFile, Annotation, StagedResponse, ReflectionLevel } from '../types';

interface ImagePanelProps {
  imageFile: ImageFile | null;
  onImageUpload: (file: ImageFile) => void;
  isChatActive: boolean;
  annotations: Annotation[];
  stagedResponses?: StagedResponse[]; // New prop for uncommitted pins
  draftPin: { x: number, y: number } | null;
  onImageClick: (x: number, y: number) => void;
  onPinClick: (annotationId: string) => void;
  highlightedAnnotationId: string | null;
}

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

const ImagePanel: React.FC<ImagePanelProps> = ({ 
  imageFile, 
  onImageUpload, 
  isChatActive,
  annotations,
  stagedResponses = [],
  draftPin,
  onImageClick,
  onPinClick,
  highlightedAnnotationId
}) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
        alert(`Das Dateiformat "${file.type}" wird leider nicht unterstützt.\nBitte verwende JPG, PNG, WEBP oder HEIC.`);
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        const mimeType = file.type;
        onImageUpload({ data: base64Data, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClickInternal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageFile || !isChatActive || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      onImageClick(x, y);
    }
  };

  const getPinStyle = (level: ReflectionLevel, isHighlighted: boolean) => {
    // Base styles
    let base = "absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-transform hover:scale-110 z-10 ";
    
    // Highlighted state (Filled color, white text, thick ring)
    if (isHighlighted) {
      base += "scale-125 border-2 border-white text-white ring-4 ";
      switch (level) {
        case ReflectionLevel.FUNCTIONAL: return base + "bg-blue-600 ring-blue-200";
        case ReflectionLevel.EMOTIONAL: return base + "bg-rose-600 ring-rose-200";
        case ReflectionLevel.SYMBOLIC: return base + "bg-purple-600 ring-purple-200";
        default: return base + "bg-indigo-600 ring-indigo-200";
      }
    } 
    // Normal state (Pastel bg, Darker text, Border)
    else {
      base += "border ";
      switch (level) {
        case ReflectionLevel.FUNCTIONAL: 
          return base + "bg-blue-100 text-blue-800 border-blue-400 hover:bg-blue-200";
        case ReflectionLevel.EMOTIONAL: 
          return base + "bg-rose-100 text-rose-800 border-rose-400 hover:bg-rose-200";
        case ReflectionLevel.SYMBOLIC: 
          return base + "bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200";
        default: 
          return base + "bg-gray-100 text-gray-800 border-gray-400 hover:bg-gray-200";
      }
    }
  };

  return (
    <div className="h-full w-full bg-gray-100 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-200">
      {imageFile ? (
        <div 
          className="relative w-full h-full flex items-center justify-center bg-slate-200"
        > 
          <div className="relative inline-block max-w-full max-h-full">
            <img 
              ref={imageRef}
              src={`data:${imageFile.mimeType};base64,${imageFile.data}`} 
              alt="Uploaded" 
              className={`max-w-full max-h-[85vh] object-contain shadow-lg ${isChatActive ? 'cursor-crosshair' : ''}`}
              onClick={handleImageClickInternal}
            />
            
            {/* 1. Committed Pins (Colored by Level) */}
            {annotations.map((ann, index) => {
              const isHighlighted = highlightedAnnotationId === ann.id;
              return (
                <button
                  key={ann.id}
                  onClick={(e) => { e.stopPropagation(); onPinClick(ann.id); }}
                  className={getPinStyle(ann.level, isHighlighted)}
                  style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                >
                  {index + 1}
                </button>
              );
            })}

            {/* 2. Staged Pins (Green - for responses not yet sent) */}
            {stagedResponses.map((staged, index) => {
              if (!staged.draftPin) return null;
              return (
                <div
                  key={staged.id}
                  className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md z-10 bg-emerald-500 text-white border-2 border-white"
                  style={{ left: `${staged.draftPin.x}%`, top: `${staged.draftPin.y}%` }}
                  title={staged.text}
                >
                  +
                </div>
              );
            })}

            {/* 3. Current Active Draft Pin (Pulse) */}
            {draftPin && (
              <div 
                className="absolute w-4 h-4 -ml-2 -mt-2 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse z-20 pointer-events-none"
                style={{ left: `${draftPin.x}%`, top: `${draftPin.y}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                  Neuer Ort
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center p-10 relative w-full h-full flex flex-col items-center justify-center group cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Bild hochladen</h3>
          <p className="text-gray-400 mb-8 max-w-xs mx-auto">Ziehe ein Bild hierher oder klicke, um den Upload zu starten.</p>
          
          <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      )}

      {isChatActive && !draftPin && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-gray-200 text-xs text-gray-500 pointer-events-none transition-opacity opacity-70 hover:opacity-100">
          👆 Tippe auf das Bild, um deine Antwort an einen Ort zu pinnen.
        </div>
      )}
    </div>
  );
};

export default ImagePanel;