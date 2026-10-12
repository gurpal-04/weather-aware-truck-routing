import React, { useMemo, useState, useRef, useEffect } from 'react';
import Map, { Source, Layer, Popup, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

interface RouteMapProps {
  routes: any[];
  selectedRouteId: string | null;
  heatmapData?: any[];
}

const formatEta = (properties: any) => {
  const rawDate = properties?.eta_timestamp || properties?.timestamp;
  if (!rawDate) return 'N/A';
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const RouteMap: React.FC<RouteMapProps> = ({ routes, selectedRouteId, heatmapData }) => {
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const mapRef = useRef<MapRef>(null);

  const mapData = useMemo(() => {
    if (!routes || routes.length === 0) return null;

    const routeFeatures = routes.map((route, idx) => ({
      type: 'Feature',
      properties: {
        id: route.id,
        is_selected: route.id === selectedRouteId,
        color: route.id === selectedRouteId ? '#2563eb' : '#9ca3af',
        title: `Route ${idx + 1}`
      },
      geometry: {
        type: 'LineString',
        coordinates: route.coordinates
      }
    }));

    const checkpointFeatures: any[] = [];
    routes.forEach(route => {
      if (route.id === selectedRouteId) {
        const checkpointsToUse = heatmapData && heatmapData.length > 0 ? heatmapData : route.checkpoints;
        checkpointsToUse.forEach((cp: any, idx: number) => {
          let riskColor = '#10b981'; // LOW: Green
          if (cp.final_risk === 1) riskColor = '#fcd34d'; // MODERATE: Yellow
          if (cp.final_risk === 2) riskColor = '#f97316'; // HIGH: Orange
          if (cp.final_risk === 3) riskColor = '#ef4444'; // SEVERE: Red
          if (cp.final_risk === 4) riskColor = '#7f1d1d'; // NO TRAVEL: Dark Red
          if (cp.final_risk === -1) riskColor = '#9ca3af'; // UNKNOWN: Gray
          
          checkpointFeatures.push({
            type: 'Feature',
            properties: {
              ...cp,
              color: riskColor,
              index: idx,
              risk_weight: cp.final_risk === -1 ? 0 : cp.final_risk
            },
            geometry: {
              type: 'Point',
              coordinates: [cp.lon, cp.lat]
            }
          });
        });
      }
    });

    return {
      routes: {
        type: 'FeatureCollection',
        features: routeFeatures
      },
      checkpoints: {
        type: 'FeatureCollection',
        features: checkpointFeatures
      }
    };
  }, [routes, selectedRouteId, heatmapData]);

  // Calculate bounds and fit map
  useEffect(() => {
    if (mapData && mapRef.current) {
      const selectedRouteGeo = mapData.routes.features.find((f: any) => f.properties.is_selected);
      if (selectedRouteGeo) {
        const bounds = selectedRouteGeo.geometry.coordinates.reduce((b: any, coord: any) => {
          return [
            [Math.min(b[0][0], coord[0]), Math.min(b[0][1], coord[1])],
            [Math.max(b[1][0], coord[0]), Math.max(b[1][1], coord[1])]
          ];
        }, [[180, 90], [-180, -90]]);
        
        mapRef.current.fitBounds(bounds, {
          padding: 60,
          duration: 1000
        });
      }
    }
  }, [mapData, selectedRouteId]);

  if (!mapData) {
    return <div className="h-full flex items-center justify-center text-gray-400">Enter trip details to see routes</div>;
  }
  
  const start = routes[0].coordinates[0];
  const end = routes[0].coordinates[routes[0].coordinates.length - 1];

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: start[0],
          latitude: start[1],
          zoom: 5
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={['checkpoints-layer']}
        onClick={e => {
          if (e.features && e.features.length > 0) {
            setHoverInfo({
              lngLat: e.lngLat,
              feature: e.features[0]
            });
          } else {
            setHoverInfo(null);
          }
        }}
      >
        <Source id="routes" type="geojson" data={mapData.routes as any}>
          <Layer
            id="routes-layer"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['case', ['get', 'is_selected'], 5, 3],
              'line-opacity': ['case', ['get', 'is_selected'], 1, 0.5]
            }}
            layout={{
              'line-join': 'round',
              'line-cap': 'round'
            }}
          />
        </Source>

        <Source id="checkpoints" type="geojson" data={mapData.checkpoints as any}>
          {/* True Heatmap Layer */}
          <Layer 
            id="checkpoints-heatmap" 
            type="heatmap" 
            paint={{
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'risk_weight'],
                0, 0,
                4, 1
              ],
              'heatmap-intensity': 1.2,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(16, 185, 129, 0)',
                0.2, 'rgba(16, 185, 129, 0.4)',
                0.5, 'rgba(252, 211, 77, 0.7)',
                0.7, 'rgba(249, 115, 22, 0.8)',
                0.9, 'rgba(239, 68, 68, 0.9)',
                1, 'rgba(127, 29, 29, 0.9)'
              ],
              'heatmap-radius': 30,
              'heatmap-opacity': 0.7
            }}
          />
          
          <Layer
            id="checkpoints-layer"
            type="circle"
            paint={{
              'circle-radius': 5,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9
            }}
          />
        </Source>
        
        <Marker longitude={start[0]} latitude={start[1]} anchor="center">
          <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md z-10"></div>
        </Marker>

        <Marker longitude={end[0]} latitude={end[1]} anchor="bottom">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#ef4444" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md z-10">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </Marker>

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.lngLat.lng}
            latitude={hoverInfo.lngLat.lat}
            onClose={() => setHoverInfo(null)}
            closeButton={false}
            closeOnClick={false}
            className="z-50 shadow-xl"
            offset={10}
            anchor="bottom"
          >
            <div className="p-3 text-sm min-w-[200px] border-0">
              <h4 className="font-bold border-b pb-1 mb-2 text-gray-800">Checkpoint {hoverInfo.feature.properties.index}</h4>
              <div className="grid grid-cols-2 gap-y-1 text-gray-600">
                <span>Dist:</span> <span className="font-medium text-gray-900">{hoverInfo.feature.properties.cumulative_distance.toFixed(1)} mi</span>
                <span>ETA:</span> <span className="font-medium text-gray-900">{formatEta(hoverInfo.feature.properties)}</span>
                <span>Wind:</span> <span className="font-medium text-gray-900">{hoverInfo.feature.properties.wind_mph?.toFixed(1) || 'N/A'} mph</span>
                <span>Rain:</span> <span className="font-medium text-gray-900">{hoverInfo.feature.properties.rain_in_hr?.toFixed(2) || '0'} in/hr</span>
                <span>Snow:</span> <span className="font-medium text-gray-900">{hoverInfo.feature.properties.snow_in_hr?.toFixed(2) || '0'} in/hr</span>
              </div>
              <div className="mt-2 pt-2 border-t font-semibold text-gray-800 flex justify-between">
                 <span>Risk:</span>
                 <span style={{color: hoverInfo.feature.properties.color}}>
                   {['Unknown', 'Low', 'Moderate', 'High', 'Severe', 'No Travel'][hoverInfo.feature.properties.final_risk + 1]}
                 </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default RouteMap;
