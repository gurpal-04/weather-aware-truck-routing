import math
from typing import List, Tuple, Dict, Any

def haversine(lon1, lat1, lon2, lat2):
    R = 3958.8 # miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def interpolate_point(lon1, lat1, lon2, lat2, fraction):
    return (
        lon1 + (lon2 - lon1) * fraction,
        lat1 + (lat2 - lat1) * fraction
    )

def generate_checkpoints(coordinates: List[Tuple[float, float]], interval_miles: float, total_duration_seconds: float) -> List[Dict[str, Any]]:
    # coordinates: list of [lon, lat]
    if not coordinates:
        return []
        
    checkpoints = []
    
    # Starting point
    checkpoints.append({
        "lon": coordinates[0][0],
        "lat": coordinates[0][1],
        "cumulative_distance": 0.0,
        "distance_from_prev": 0.0
    })
    
    current_dist = 0.0
    target_dist = interval_miles
    total_dist = 0.0
    
    # First, calculate total distance to estimate ETAs correctly if duration is global
    segment_distances = []
    for i in range(len(coordinates) - 1):
        d = haversine(coordinates[i][0], coordinates[i][1], coordinates[i+1][0], coordinates[i+1][1])
        segment_distances.append(d)
        total_dist += d
        
    current_dist = 0.0
    
    for i in range(len(coordinates) - 1):
        p1 = coordinates[i]
        p2 = coordinates[i+1]
        seg_dist = segment_distances[i]
        
        if seg_dist == 0:
            continue
            
        while current_dist + seg_dist >= target_dist:
            # We found a checkpoint
            remaining_to_target = target_dist - current_dist
            fraction = remaining_to_target / seg_dist
            
            cp_lon, cp_lat = interpolate_point(p1[0], p1[1], p2[0], p2[1], fraction)
            
            checkpoints.append({
                "lon": cp_lon,
                "lat": cp_lat,
                "cumulative_distance": target_dist,
                "distance_from_prev": target_dist - checkpoints[-1]["cumulative_distance"]
            })
            
            target_dist += interval_miles
            
        current_dist += seg_dist
        
    # Always include destination if it's not exactly on the last target
    last_cp = checkpoints[-1]
    dest = coordinates[-1]
    
    if total_dist > last_cp["cumulative_distance"] + 0.001:
         checkpoints.append({
             "lon": dest[0],
             "lat": dest[1],
             "cumulative_distance": total_dist,
             "distance_from_prev": total_dist - last_cp["cumulative_distance"]
         })
         
    # Add ETAs (distance-weighted)
    for cp in checkpoints:
        fraction = cp["cumulative_distance"] / total_dist if total_dist > 0 else 0
        cp["eta_offset_seconds"] = total_duration_seconds * fraction
        
    return checkpoints
