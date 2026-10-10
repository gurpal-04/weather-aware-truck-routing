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
        
        let statusColor = "bg-green-100 border-green-300 text-green-800";
        if (summary.is_unsafe) statusColor = "bg-red-100 border-red-300 text-red-800";
        else if (summary.missing_data) statusColor = "bg-yellow-100 border-yellow-300 text-yellow-800";
        
        return (
          <div 
            key={route.id} 
            className={`p-4 border-2 rounded cursor-pointer transition-colors ${
              isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300'
            } bg-white`}
            onClick={() => onSelect(route.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-800">Route {idx + 1}</h3>
              <span className={`text-xs font-semibold px-2 py-1 rounded border ${statusColor}`}>
                {summary.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{route.recommendation_rationale}</p>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-gray-500">Distance:</span> {summary.total_distance.toFixed(1)} mi</div>
              <div><span className="text-gray-500">Time:</span> {(summary.total_duration / 3600).toFixed(1)} hrs</div>
            </div>
            
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-red-600 font-medium">No Travel Miles:</span>
                <span className="font-semibold">{summary.miles_no_travel.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-orange-600 font-medium">Severe Miles:</span>
                <span className="font-semibold">{summary.miles_severe.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-600 font-medium">High Miles:</span>
                <span className="font-semibold">{summary.miles_high.toFixed(1)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteComparison;
