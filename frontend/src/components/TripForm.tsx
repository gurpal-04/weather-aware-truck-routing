import React, { useState } from 'react';

interface TripFormProps {
  onAnalyze: (data: any) => void;
  loading: boolean;
}

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
      <div>
        <label className="block text-sm font-medium mb-1">Origin (City or Lat,Lon)</label>
        <input 
          type="text" 
          value={origin} 
          onChange={e => setOrigin(e.target.value)}
          className="w-full border rounded p-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Destination (City or Lat,Lon)</label>
        <input 
          type="text" 
          value={destination} 
          onChange={e => setDestination(e.target.value)}
          className="w-full border rounded p-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Departure Time</label>
        <input 
          type="datetime-local" 
          value={departureTime} 
          onChange={e => setDepartureTime(e.target.value)}
          className="w-full border rounded p-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Load Weight (lbs)</label>
        <input 
          type="number" 
          value={loadWeight} 
          onChange={e => setLoadWeight(Number(e.target.value))}
          className="w-full border rounded p-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Checkpoint Interval (miles)</label>
        <select 
          value={intervalMiles} 
          onChange={e => setIntervalMiles(Number(e.target.value))}
          className="w-full border rounded p-2 text-sm"
        >
          <option value={10}>10 miles</option>
          <option value={25}>25 miles</option>
          <option value={50}>50 miles</option>
        </select>
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze Routes'}
      </button>
    </form>
  );
};

export default TripForm;
