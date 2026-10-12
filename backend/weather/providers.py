import requests
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

class WeatherProviderError(Exception):
    pass

def chunk_list(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def _fetch_chunk(lats: List[str], lons: List[str], max_retries=3) -> List[Dict[str, Any]]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": ",".join(lats),
        "longitude": ",".join(lons),
        "hourly": "wind_speed_10m,precipitation,snowfall",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "timezone": "UTC",
        "forecast_days": 14 
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(url, params=params, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()
    
    if isinstance(data, dict) and "hourly" in data:
        data = [data]
    return data

def fetch_weather_for_checkpoints(checkpoints: List[Dict[str, float]], departure_time: datetime) -> List[Dict[str, Any]]:
    if not checkpoints:
        return []
        
    results = []
    
    # Process in chunks of 50
    for chunk in chunk_list(checkpoints, 50):
        lats = [str(cp['lat']) for cp in chunk]
        lons = [str(cp['lon']) for cp in chunk]
        
        try:
            data = _fetch_chunk(lats, lons)
            
            for i, cp in enumerate(chunk):
                cp_data = data[i]
                hourly = cp_data.get("hourly", {})
                times = hourly.get("time", [])
                wind_speeds = hourly.get("wind_speed_10m", [])
                precips = hourly.get("precipitation", [])
                snowfalls = hourly.get("snowfall", [])
                
                eta = departure_time + timedelta(seconds=cp.get("eta_offset_seconds", 0))
                
                closest_idx = -1
                min_diff = float('inf')
                
                for j, t_str in enumerate(times):
                    t = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
                    diff = abs((t - eta).total_seconds())
                    if diff < min_diff:
                        min_diff = diff
                        closest_idx = j
                        
                if closest_idx != -1 and min_diff <= 3600 * 2: 
                    results.append({
                        "wind_mph": wind_speeds[closest_idx],
                        "rain_in_hr": precips[closest_idx],
                        "snow_in_hr": snowfalls[closest_idx], 
                        "timestamp": times[closest_idx],
                        "eta_timestamp": eta.isoformat()
                    })
                else:
                    results.append({
                        "wind_mph": None,
                        "rain_in_hr": None,
                        "snow_in_hr": None,
                        "timestamp": None,
                        "eta_timestamp": eta.isoformat()
                    })
        except requests.RequestException as e:
            print(f"Weather API Error for chunk: {e}")
            # Fallback to None if request fails
            for cp in chunk:
                eta = departure_time + timedelta(seconds=cp.get("eta_offset_seconds", 0))
                results.append({
                    "wind_mph": None,
                    "rain_in_hr": None,
                    "snow_in_hr": None,
                    "timestamp": None,
                    "eta_timestamp": eta.isoformat()
                })
                
    return results

def fetch_weather_forecast(checkpoints: List[Dict[str, float]], target_time: datetime) -> List[Dict[str, Any]]:
    # Very similar, but uses a single target_time for all checkpoints (heatmap)
    # Re-use logic.
    mocked_checkpoints = []
    for cp in checkpoints:
        mocked_checkpoints.append({
            "lat": cp["lat"],
            "lon": cp["lon"],
            "eta_offset_seconds": 0
        })
    return fetch_weather_for_checkpoints(mocked_checkpoints, target_time)
