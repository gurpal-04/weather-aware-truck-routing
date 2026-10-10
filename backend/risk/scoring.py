from typing import List, Dict, Any, Tuple
from .classifier import RiskLevel

def aggregate_route_risk(route_checkpoints: List[Dict[str, Any]], total_distance_miles: float, total_duration_seconds: float) -> Dict[str, Any]:
    # Each checkpoint should have a 'distance_from_prev' representing the segment length
    # and a 'risk' dictionary from calculate_checkpoint_risk.
    
    risk_distances = {
        RiskLevel.LOW: 0.0,
        RiskLevel.MODERATE: 0.0,
        RiskLevel.HIGH: 0.0,
        RiskLevel.SEVERE: 0.0,
        RiskLevel.NO_TRAVEL: 0.0,
        RiskLevel.UNKNOWN: 0.0,
    }
    
    worst_risk = RiskLevel.UNKNOWN
    unsafe_count = 0
    
    for cp in route_checkpoints:
        dist = cp.get("distance_from_prev", 0.0)
        risk = cp.get("final_risk", RiskLevel.UNKNOWN)
        
        risk_distances[risk] += dist
        
        if risk != RiskLevel.UNKNOWN and (worst_risk == RiskLevel.UNKNOWN or risk > worst_risk):
            worst_risk = risk
            
        if risk == RiskLevel.NO_TRAVEL:
            unsafe_count += 1
            
    # Calculate percentages and weighted average
    total_valid_dist = sum(v for k, v in risk_distances.items() if k != RiskLevel.UNKNOWN)
    
    average_risk = 0.0
    if total_valid_dist > 0:
        sum_risk = (
            risk_distances[RiskLevel.LOW] * RiskLevel.LOW +
            risk_distances[RiskLevel.MODERATE] * RiskLevel.MODERATE +
            risk_distances[RiskLevel.HIGH] * RiskLevel.HIGH +
            risk_distances[RiskLevel.SEVERE] * RiskLevel.SEVERE +
            risk_distances[RiskLevel.NO_TRAVEL] * RiskLevel.NO_TRAVEL
        )
        average_risk = sum_risk / total_valid_dist
        
    percentages = {
        k.name: (v / total_distance_miles * 100) if total_distance_miles > 0 else 0
        for k, v in risk_distances.items()
    }
    
    is_unsafe = risk_distances[RiskLevel.NO_TRAVEL] > 0
    missing_data = risk_distances[RiskLevel.UNKNOWN] > 0
    
    status = "Safe"
    if is_unsafe:
        status = "Unsafe - Contains No Travel segments"
    elif missing_data and total_valid_dist == 0:
        status = "Unknown - No weather data available"
    elif missing_data:
        status = "Warning - Incomplete weather coverage"
    
    return {
        "total_distance": total_distance_miles,
        "total_duration": total_duration_seconds,
        "miles_low": risk_distances[RiskLevel.LOW],
        "miles_moderate": risk_distances[RiskLevel.MODERATE],
        "miles_high": risk_distances[RiskLevel.HIGH],
        "miles_severe": risk_distances[RiskLevel.SEVERE],
        "miles_no_travel": risk_distances[RiskLevel.NO_TRAVEL],
        "miles_unknown": risk_distances[RiskLevel.UNKNOWN],
        "percentages": percentages,
        "average_risk": average_risk,
        "worst_checkpoint": worst_risk.name if worst_risk != RiskLevel.UNKNOWN else "UNKNOWN",
        "unsafe_count": unsafe_count,
        "status": status,
        "is_unsafe": is_unsafe,
        "missing_data": missing_data
    }

def rank_routes(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Routes is a list of dictionaries, each containing 'id' and 'summary' (output of aggregate_route_risk)
    
    def sort_key(route):
        summary = route['summary']
        # 1. Fewest Severe miles
        # 2. Fewest High miles
        # 3. Lowest average risk
        # 4. Shortest travel time
        # Unsafe routes should be pushed to the bottom. We can achieve this by adding a big penalty.
        is_unsafe_val = 1 if summary['is_unsafe'] else 0
        return (
            is_unsafe_val,
            summary['miles_severe'],
            summary['miles_high'],
            summary['average_risk'],
            summary['total_duration'],
            summary['total_distance'] # deterministic tie-breaker
        )
        
    ranked = sorted(routes, key=sort_key)
    
    # Assign recommendation rationale
    for i, route in enumerate(ranked):
        summary = route['summary']
        if summary['is_unsafe']:
            route['recommendation_rationale'] = "Unsafe route due to No Travel conditions."
        elif summary['missing_data'] and summary['miles_low'] + summary['miles_moderate'] + summary['miles_high'] + summary['miles_severe'] == 0:
             route['recommendation_rationale'] = "Insufficient weather data."
        elif i == 0:
            route['recommendation_rationale'] = "Recommended safest and most efficient route."
        else:
            route['recommendation_rationale'] = "Alternative route."
            
    return ranked
