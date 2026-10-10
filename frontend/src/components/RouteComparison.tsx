import React from 'react';

interface RouteComparisonProps {
  routes: any[];
  selectedRouteId: string | null;
  onSelect: (id: string) => void;
}

const RouteComparison: React.FC<RouteComparisonProps> = ({ routes, selectedRouteId, onSelect }) => {
  return (
    <div className="space-y-4">
      {routes.map((route, idx) => {
        const { summary } = route;
        const isSelected = selectedRouteId === route.id;
        
        let statusColor = "bg-green-50 border-green-200 text-green-700";
        let statusIcon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
        if (summary.is_unsafe) {
           statusColor = "bg-red-50 border-red-200 text-red-700";
           statusIcon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
        } else if (summary.missing_data) {
           statusColor = "bg-yellow-50 border-yellow-200 text-yellow-700";
           statusIcon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
        }
        
        return (
          <div 
            key={route.id} 
            className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
              isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white'
            }`}
            onClick={() => onSelect(route.id)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className={`font-bold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>Route {idx + 1}</h3>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border flex items-center ${statusColor}`}>
                {statusIcon}
                {summary.status.split(' - ')[0]}
              </span>
            </div>
            
            <p className="text-xs text-gray-500 mb-4 leading-relaxed bg-gray-50 p-2 rounded">{route.recommendation_rationale}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
              <div className="flex flex-col">
                 <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Distance</span>
                 <span className="font-semibold text-gray-700">{summary.total_distance.toFixed(0)} mi</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Time</span>
                 <span className="font-semibold text-gray-700">{(summary.total_duration / 3600).toFixed(1)} hrs</span>
              </div>
            </div>
            
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs items-center">
                <span className="text-red-600 font-medium flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-red-600"></div> No Travel
                </span>
                <span className="font-semibold">{summary.miles_no_travel.toFixed(1)} mi</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-orange-500 font-medium flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-orange-500"></div> Severe
                </span>
                <span className="font-semibold">{summary.miles_severe.toFixed(1)} mi</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-yellow-600 font-medium flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-yellow-500"></div> High
                </span>
                <span className="font-semibold">{summary.miles_high.toFixed(1)} mi</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteComparison;
