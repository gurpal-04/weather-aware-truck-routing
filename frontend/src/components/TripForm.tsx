import React, { useState } from 'react';
import Select from 'react-select';

interface TripFormProps {
  onAnalyze: (data: any) => void;
  loading: boolean;
}

const intervalOptions = [
  { value: 10, label: 'Every 10 miles (High Precision)' },
  { value: 25, label: 'Every 25 miles (Standard)' },
  { value: 50, label: 'Every 50 miles (Fast)' }
];

const TripForm: React.FC<TripFormProps> = ({ onAnalyze, loading }) => {
  const [origin, setOrigin] = useState("New York City, NY");
  const [destination, setDestination] = useState("Los Angeles, CA");
  const [departureTime, setDepartureTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [loadWeight, setLoadWeight] = useState(40000);
  const [intervalMiles, setIntervalMiles] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // We try to see if it's coordinates (contains numbers and comma), else pass as text
    const isCoords = (str: string) => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(str);
    
    const payload: any = {
      departure_time: new Date(departureTime).toISOString(),
      load_weight: loadWeight,
      interval_miles: intervalMiles
    };

    if (isCoords(origin) && isCoords(destination)) {
      const [startLat, startLon] = origin.split(',').map(s => s.trim());
      const [endLat, endLon] = destination.split(',').map(s => s.trim());
      payload.start_lat = startLat;
      payload.start_lon = startLon;
      payload.end_lat = endLat;
      payload.end_lon = endLon;
    } else {
      payload.origin = origin;
      payload.destination = destination;
    }
    
    onAnalyze(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Origin</label>
        <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
          <div className="pl-3 pr-2 text-gray-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <input 
            type="text" 
            value={origin} 
            onChange={e => setOrigin(e.target.value)}
            className="w-full p-2 outline-none text-sm text-gray-700 placeholder-gray-400"
            placeholder="City or Lat,Lon"
            required
          />
        </div>
      </div>
      
      <div className="relative">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Destination</label>
        <div className="flex items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
          <div className="pl-3 pr-2 text-red-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <input 
            type="text" 
            value={destination} 
            onChange={e => setDestination(e.target.value)}
            className="w-full p-2 outline-none text-sm text-gray-700 placeholder-gray-400"
            placeholder="City or Lat,Lon"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Departure Time</label>
          <input 
            type="datetime-local" 
            value={departureTime} 
            onChange={e => setDepartureTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Load (lbs)</label>
          <input 
            type="number" 
            value={loadWeight} 
            onChange={e => setLoadWeight(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Checkpoint Interval</label>
        <Select
          options={intervalOptions}
          value={intervalOptions.find(opt => opt.value === intervalMiles)}
          onChange={(option) => {
            if (option) setIntervalMiles(option.value);
          }}
          className="text-sm text-gray-700"
          classNames={{
            control: (state) => 
              state.isFocused 
                ? 'border-gray-300 rounded-lg shadow-none ring-2 ring-blue-500' 
                : 'border-gray-300 rounded-lg shadow-none hover:border-gray-400'
          }}
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold shadow-md shadow-blue-500/30 hover:bg-blue-700 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 mt-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Analyzing Corridor...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Find Safest Route
          </>
        )}
      </button>
    </form>
  );
};

export default TripForm;
