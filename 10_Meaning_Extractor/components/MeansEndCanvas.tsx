
import React, { useState, useRef, useEffect } from 'react';
import { MeansEndChain } from '../types';
import { Info, Target, Box } from 'lucide-react';

interface Props {
  imageSrc: string;
  chains: MeansEndChain[];
}

export const MeansEndCanvas: React.FC<Props> = ({ imageSrc, chains }) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const img = containerRef.current.querySelector('img');
        if (img) {
          setDimensions({ width: img.clientWidth, height: img.clientHeight });
        }
      }
    };

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.clientWidth, height: img.clientHeight });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <img
        src={imageSrc}
        alt="Analysis target"
        className="w-full h-auto rounded-xl shadow-lg border border-gray-100"
        onLoad={handleImageLoad}
      />

      {chains.map((chain) => {
        const { xmin, ymin, xmax, ymax } = chain.boundingBox;
        
        // Calculate percentages (Gemini returns 0-1000)
        const left = (xmin / 1000) * 100;
        const top = (ymin / 1000) * 100;
        const width = ((xmax - xmin) / 1000) * 100;
        const height = ((ymax - ymin) / 1000) * 100;

        return (
          <React.Fragment key={chain.id}>
            {/* Highlight Box */}
            <div
              className={`absolute border-2 rounded transition-all duration-300 pointer-events-none ${
                selectedPin === chain.id ? 'border-blue-500 bg-blue-500/10' : 'border-dashed border-white/50'
              }`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            />

            {/* Interactive Pin */}
            <button
              onClick={() => setSelectedPin(selectedPin === chain.id ? null : chain.id)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
                selectedPin === chain.id ? 'bg-blue-600 text-white z-20' : 'bg-white text-blue-600 z-10'
              }`}
              style={{
                left: `${left + width / 2}%`,
                top: `${top + height / 2}%`,
              }}
            >
              <Target className="w-5 h-5" />
            </button>

            {/* Insight Popover */}
            {selectedPin === chain.id && (
              <div
                className="absolute z-30 transform -translate-x-1/2 mt-10 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 min-w-[300px] animate-in fade-in slide-in-from-top-4"
                style={{
                  left: `${left + width / 2}%`,
                  top: `${top + height / 2}%`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    {chain.label}
                  </h3>
                  <button onClick={() => setSelectedPin(null)} className="text-gray-400 hover:text-gray-600">×</button>
                </div>

                <div className="space-y-4">
                  <Section title="Attributes" items={chain.attributes} color="blue" />
                  <Section title="Consequences" items={chain.consequences} color="amber" />
                  <Section title="Core Values" items={chain.values} color="emerald" />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Section = ({ title, items, color }: { title: string; items: string[]; color: 'blue' | 'amber' | 'emerald' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span key={idx} className={`px-2 py-1 text-xs font-medium rounded-lg border ${colors[color]}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};
