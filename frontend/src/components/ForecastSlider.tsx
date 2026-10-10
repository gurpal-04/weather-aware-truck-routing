import React from 'react';

interface ForecastSliderProps {
  offset: number;
  onChange: (val: number) => void;
}

const ForecastSlider: React.FC<ForecastSliderProps> = ({ offset, onChange }) => {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">Weather Forecast Map Offset</span>
        <span className="text-sm font-bold text-blue-600">+{offset} Hours</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="48" 
        step="1" 
        value={offset} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <p className="text-xs text-gray-500 mt-1">Updates map weather overlay (not trip departure time)</p>
    </div>
  );
};

export default ForecastSlider;
