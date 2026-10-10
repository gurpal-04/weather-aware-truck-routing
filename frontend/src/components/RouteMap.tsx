import React, { useMemo, useState } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

interface RouteMapProps {
  routes: any[];
  selectedRouteId: string | null;
  heatmapData?: any[];
}

const RouteMap: React.FC<RouteMapProps> = ({ routes, selectedRouteId, heatmapData }) => {
  const [hoverInfo, setHoverInfo] = useState<any>(null);

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

    const checkpointFeatures = [];
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
              index: idx
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

  if (!mapData) {
    return <div className="h-full flex items-center justify-center text-gray-500">Enter trip details to see routes</div>;
  }

  // Calculate bounds
  const start = routes[0].coordinates[0];
  
  return (
    <Map
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
        <Layer
          id="checkpoints-layer"
          type="circle"
          paint={{
            'circle-radius': 6,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }}
        />
      </Source>
      
      {hoverInfo && (
        <Popup
          longitude={hoverInfo.lngLat.lng}
          latitude={hoverInfo.lngLat.lat}
          onClose={() => setHoverInfo(null)}
          closeButton={true}
          closeOnClick={false}
          className="z-50"
        >
          <div className="p-2 text-sm max-w-xs">
            <h4 className="font-bold border-b pb-1 mb-2">Checkpoint {hoverInfo.feature.properties.index}</h4>
            <p><span className="font-semibold">Dist:</span> {hoverInfo.feature.properties.cumulative_distance.toFixed(1)} mi</p>
            <p><span className="font-semibold">Wind:</span> {hoverInfo.feature.properties.wind_mph?.toFixed(1) || 'N/A'} mph</p>
            <p><span className="font-semibold">Rain:</span> {hoverInfo.feature.properties.rain_in_hr?.toFixed(2) || 'N/A'} in/hr</p>
            <p><span className="font-semibold">Snow:</span> {hoverInfo.feature.properties.snow_in_hr?.toFixed(2) || 'N/A'} in/hr</p>
            <p><span className="font-semibold">Risk Level:</span> {hoverInfo.feature.properties.final_risk}</p>
          </div>
        </Popup>
      )}
    </Map>
  );
};

export default RouteMap;
