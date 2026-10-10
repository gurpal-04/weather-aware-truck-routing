import React, { useState } from 'react';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import RouteComparison from './components/RouteComparison';
import ForecastSlider from './components/ForecastSlider';

function App() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [forecastOffsetHours, setForecastOffsetHours] = useState(0);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
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
    setIsForecastLoading(true);

    const fetchHeatmap = async () => {
      const lats = selectedRoute.checkpoints.map((cp: any) => cp.lat).join(',');
      const lons = selectedRoute.checkpoints.map((cp: any) => cp.lon).join(',');
      
      const d = new Date(tripParams.departure_time);
      d.setHours(d.getHours() + forecastOffsetHours);
      const targetTime = d.toISOString();
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/weather/forecast/?lats=${lats}&lons=${lons}&target_time=${targetTime}&load_weight=${tripParams.load_weight}`);
        if (!response.ok) {
          if (!isCancelled) setIsForecastLoading(false);
          return;
        }
        const resData = await response.json();
        if (!isCancelled) {
          // Merge with selectedRoute checkpoints so we have cumulative_distance etc
          const merged = selectedRoute.checkpoints.map((cp: any, i: number) => ({
             ...cp,
             ...resData.data[i]
          }));
          setHeatmapData(merged);
          setIsForecastLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!isCancelled) setIsForecastLoading(false);
      }
    };
    
    fetchHeatmap();
    return () => { isCancelled = true; };
  }, [selectedRoute, forecastOffsetHours, tripParams]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-md flex items-center gap-3 z-20 relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
        <h1 className="text-xl font-bold tracking-tight">Weather-Aware Truck Routing</h1>
        {isForecastLoading && (
          <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden bg-slate-800">
            <div className="h-full bg-blue-500 w-full animate-pulse"></div>
          </div>
        )}
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-96 flex flex-col bg-white shadow-xl z-10 overflow-y-auto border-r border-gray-200">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <TripForm onAnalyze={handleAnalyze} loading={loading} />
            {error && <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm shadow-sm">{error}</div>}
          </div>
          
          {routes.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-5">
              <h2 className="text-sm uppercase tracking-wider font-bold text-gray-500 mb-4 flex items-center gap-2">
                Route Alternatives
                <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">{routes.length}</span>
              </h2>
              <RouteComparison 
                routes={routes} 
                selectedRouteId={selectedRouteId} 
                onSelect={setSelectedRouteId} 
              />
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
                {!loading && (
                   <div>
                     <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50"><path d="M9 20v-6h6v6"/><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                     <p>Enter trip details to generate routes.</p>
                   </div>
                )}
             </div>
          )}
        </div>

        {/* Main Map Area */}
        <div className="flex-1 flex flex-col relative bg-slate-200">
           <RouteMap 
              routes={routes} 
              selectedRouteId={selectedRouteId}
              heatmapData={heatmapData.length > 0 ? heatmapData : undefined}
           />
           
          {routes.length > 0 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-20">
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
