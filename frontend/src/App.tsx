import React, { useState } from 'react';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import RouteComparison from './components/RouteComparison';
import ForecastSlider from './components/ForecastSlider';

function App() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [forecastOffsetHours, setForecastOffsetHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripParams, setTripParams] = useState<any>(null);

  const handleAnalyze = async (data: any) => {
    setLoading(true);
    setError(null);
    setTripParams(data);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/routes/analyze/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze routes');
      }
      const resData = await response.json();
      setRoutes(resData.routes);
      if (resData.routes.length > 0) {
        setSelectedRouteId(resData.routes[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  React.useEffect(() => {
    if (!selectedRoute || !tripParams || forecastOffsetHours === 0) {
      setHeatmapData([]); // Just use default route checkpoints
      return;
    }
    
    let isCancelled = false;

    const fetchHeatmap = async () => {
      const lats = selectedRoute.checkpoints.map((cp: any) => cp.lat).join(',');
      const lons = selectedRoute.checkpoints.map((cp: any) => cp.lon).join(',');
      
      const d = new Date(tripParams.departure_time);
      d.setHours(d.getHours() + forecastOffsetHours);
      const targetTime = d.toISOString();
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/weather/forecast/?lats=${lats}&lons=${lons}&target_time=${targetTime}&load_weight=${tripParams.load_weight}`);
        if (!response.ok) return;
        const resData = await response.json();
        if (!isCancelled) {
          // Merge with selectedRoute checkpoints so we have cumulative_distance etc
          const merged = selectedRoute.checkpoints.map((cp: any, i: number) => ({
             ...cp,
             ...resData.data[i]
          }));
          setHeatmapData(merged);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchHeatmap();
    return () => { isCancelled = true; };
  }, [selectedRoute, forecastOffsetHours, tripParams]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-blue-900 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold">Weather-Aware Truck Routing</h1>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 flex flex-col bg-white shadow-md z-10 overflow-y-auto">
          <div className="p-4 border-b">
            <TripForm onAnalyze={handleAnalyze} loading={loading} />
            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          </div>
          
          {routes.length > 0 && (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4">Route Alternatives</h2>
              <RouteComparison 
                routes={routes} 
                selectedRouteId={selectedRouteId} 
                onSelect={setSelectedRouteId} 
              />
            </div>
          )}
        </div>

        {/* Main Map Area */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 bg-gray-200 relative">
             <RouteMap 
                routes={routes} 
                selectedRouteId={selectedRouteId}
                heatmapData={heatmapData.length > 0 ? heatmapData : undefined}
             />
          </div>
          {routes.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded shadow-lg z-20 opacity-95">
              <ForecastSlider 
                offset={forecastOffsetHours} 
                onChange={setForecastOffsetHours} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
