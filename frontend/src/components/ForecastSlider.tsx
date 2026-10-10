import React from 'react';

interface ForecastSliderProps {
  offset: number;
  onChange: (val: number) => void;
}

const ForecastSlider: React.FC<ForecastSliderProps> = ({ offset, onChange }) => {
  return (
    <div className="bg-white/95 backdrop-blur shadow-2xl rounded-xl p-5 border border-gray-100 flex flex-col items-center">
      <div className="flex justify-between w-full mb-3 text-sm font-semibold text-gray-700">
        <span className="flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
           Weather Forecast Offset
        </span>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{offset > 0 ? `+${offset} hrs` : 'Current Time'}</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="48" 
        step="1" 
        value={offset} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between w-full mt-2 text-xs text-gray-400 font-medium px-1">
        <span>0h</span>
        <span>12h</span>
        <span>24h</span>
        <span>36h</span>
        <span>48h</span>
      </div>
    </div>
  );
};

export default ForecastSlider;
