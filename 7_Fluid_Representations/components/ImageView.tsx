
import React, { useRef } from 'react';

interface ImageViewProps {
  image: string | null;
  focusObject: string;
  onUpload: (base64: string) => void;
  onFocusChange: (focus: string) => void;
}

export const ImageView: React.FC<ImageViewProps> = ({ image, focusObject, onUpload, onFocusChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 animate-fade-in w-full max-w-4xl mx-auto">
      {image ? (
        <div className="w-full flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 relative group overflow-hidden rounded-2xl shadow-xl bg-white p-2 w-full">
            <img 
              src={image} 
              alt="Translated Source" 
              className="w-full h-auto max-h-[60vh] rounded-xl object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-gray-900 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
              >
                Replace Image
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-80 space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Targeted Focus</label>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Specify an object or area within the image to make the AI analysis more precise.
              </p>
              <div className="relative">
                <input 
                  type="text"
                  value={focusObject}
                  onChange={(e) => onFocusChange(e.target.value)}
                  placeholder="e.g. the blue lamp, the signature..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
                {focusObject && (
                  <button 
                    onClick={() => onFocusChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center space-x-2 text-[10px] text-blue-500 font-bold uppercase italic">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <span>Helps AI prioritize specific details</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-lg aspect-video border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group bg-white/50 backdrop-blur-sm"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors shadow-inner">
            <svg className="w-10 h-10 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mt-6 text-gray-800 font-bold">Upload an image to start</h3>
          <p className="text-sm text-gray-500 mt-1">PNG, JPG or WEBP accepted</p>
        </div>
      )}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />
    </div>
  );
};
