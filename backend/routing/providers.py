import os
import requests
import json
from typing import List, Dict, Any

class RoutingProviderError(Exception):
    pass

def geocode(query: str) -> (float, float):
    """
    Returns (lon, lat) for a given text query using ORS Geocoding API.
    """
    api_key = os.environ.get("ORS_API_KEY")
    if not api_key:
        raise RoutingProviderError("ORS_API_KEY environment variable is not set")
    
    url = f"https://api.openrouteservice.org/geocode/search"
    params = {
        "api_key": api_key,
        "text": query,
        "size": 1
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        features = data.get("features", [])
        if not features:
            raise RoutingProviderError(f"Could not resolve location: {query}")
        coords = features[0]["geometry"]["coordinates"]
        return coords[0], coords[1] # lon, lat
    except requests.RequestException as e:
        raise RoutingProviderError(f"Geocoding failed for {query}: {str(e)}")

def get_routes(start_lon: float, start_lat: float, end_lon: float, end_lat: float) -> List[Dict[str, Any]]:
    """
    Fetches alternative routes from OpenRouteService.
    start_lon, start_lat: Origin
    end_lon, end_lat: Destination
    """
    api_key = os.environ.get("ORS_API_KEY")
    if not api_key:
        raise RoutingProviderError("ORS_API_KEY environment variable is not set")
        
    url = "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson"
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json"
    }
    
    body = {
        "coordinates": [[start_lon, start_lat], [end_lon, end_lat]],
        "alternative_routes": {
            "target_count": 3,
            "weight_factor": 1.4,
            "share_factor": 0.6
        },
        "instructions": False
    }
    
    try:
        response = requests.post(url, headers=headers, json=body, timeout=10)
        
        # If alternative routes fail due to distance limit, fallback to single route
        if response.status_code == 400:
            error_data = response.json()
            if error_data.get("error", {}).get("code") == 2004:
                del body["alternative_routes"]
                response = requests.post(url, headers=headers, json=body, timeout=10)
                
        response.raise_for_status()
        data = response.json()
        
        routes = []
        features = data.get("features", [])
        for i, feature in enumerate(features):
            props = feature.get("properties", {})
            summary = props.get("summary", {})
            
            # ORS returns distance in meters, duration in seconds
            distance_meters = summary.get("distance")
            duration_seconds = summary.get("duration")

            segments = props.get("segments", [])
            if distance_meters is None and segments:
                distance_meters = sum(s.get("distance", 0) for s in segments)
            if duration_seconds is None and segments:
                duration_seconds = sum(s.get("duration", 0) for s in segments)

            distance_meters = float(distance_meters or 0)
            duration_seconds = float(duration_seconds or 0)

            distance_miles = distance_meters * 0.000621371

            # Fallback if duration is missing or 0 but distance is known (average 50 mph)
            if duration_seconds <= 0 and distance_miles > 0:
                duration_seconds = (distance_miles / 50.0) * 3600.0

            geometry = feature.get("geometry", {})
            coordinates = geometry.get("coordinates", [])

            routes.append({
                "id": f"route_{i}",
                "distance_miles": distance_miles,
                "duration_seconds": duration_seconds,
                "coordinates": coordinates
            })
            
        return routes
    except requests.RequestException as e:
        if hasattr(e, 'response') and e.response is not None:
            try:
                err_json = e.response.json()
                error_obj = err_json.get("error", {})
                code = error_obj.get("code")
                msg = error_obj.get("message", "")
                
                if code == 2004:
                    if "greater than 6000000.0" in msg:
                        raise RoutingProviderError("The selected route is too long. The routing service only supports trips up to ~3,728 miles (6,000 km). Please choose closer locations.")
                    raise RoutingProviderError(f"Route parameter limit exceeded: {msg}")
                    
                if code == 2010:
                    raise RoutingProviderError("Could not find a valid driving route between these locations. Ensure they are connected by land.")
                
                # Catch-all for other ORS JSON errors
                if msg:
                    raise RoutingProviderError(f"Routing error: {msg}")
            except ValueError:
                pass
            
            raise RoutingProviderError(f"Routing service returned an error ({e.response.status_code}). Please try again.")
        else:
            raise RoutingProviderError("Failed to connect to the routing service. Please check your internet connection.")
