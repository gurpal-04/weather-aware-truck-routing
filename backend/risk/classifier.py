from enum import IntEnum
from typing import Optional, Dict, Any


class RiskLevel(IntEnum):
    UNKNOWN = -1
    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4


def classify_wind(wind_mph: float) -> RiskLevel:
    if wind_mph is None:
        return RiskLevel.UNKNOWN
    if wind_mph < 25:
        return RiskLevel.LOW
    elif wind_mph < 35:
        return RiskLevel.MODERATE
    elif wind_mph < 45:
        return RiskLevel.HIGH
    elif wind_mph < 55:
        return RiskLevel.SEVERE
    else:
        return RiskLevel.NO_TRAVEL


def classify_rain(rain_in_hr: float) -> RiskLevel:
    if rain_in_hr is None:
        return RiskLevel.UNKNOWN
    if rain_in_hr < 0.10:
        return RiskLevel.LOW
    elif rain_in_hr <= 0.25:
        return RiskLevel.MODERATE
    elif rain_in_hr < 0.50:
        return RiskLevel.HIGH
    elif rain_in_hr <= 1.00:
        return RiskLevel.SEVERE
    else:
        return RiskLevel.NO_TRAVEL


def classify_snow(snow_in_hr: float) -> RiskLevel:
    if snow_in_hr is None:
        return RiskLevel.UNKNOWN
    if snow_in_hr < 0.5:
        return RiskLevel.LOW
    elif snow_in_hr <= 1.0:
        return RiskLevel.MODERATE
    elif snow_in_hr < 2.0:
        return RiskLevel.HIGH
    elif snow_in_hr <= 3.0:
        return RiskLevel.SEVERE
    else:
        return RiskLevel.NO_TRAVEL


def apply_load_rules(wind_mph: float, load_lbs: float, base_wind_risk: RiskLevel) -> RiskLevel:
    if wind_mph is None or load_lbs is None:
        return base_wind_risk
    
    if wind_mph >= 55:
        return RiskLevel.NO_TRAVEL
    elif 45 <= wind_mph < 55 and load_lbs > 30000:
        return RiskLevel.NO_TRAVEL
    elif 35 <= wind_mph < 45 and load_lbs > 40000:
        return max(RiskLevel.SEVERE, base_wind_risk)
    
    return base_wind_risk


def calculate_checkpoint_risk(
    wind_mph: Optional[float] = None,
    rain_in_hr: Optional[float] = None,
    snow_in_hr: Optional[float] = None,
    load_lbs: Optional[float] = None
) -> Dict[str, Any]:
    
    wind_risk = classify_wind(wind_mph) if wind_mph is not None else RiskLevel.UNKNOWN
    rain_risk = classify_rain(rain_in_hr) if rain_in_hr is not None else RiskLevel.UNKNOWN
    snow_risk = classify_snow(snow_in_hr) if snow_in_hr is not None else RiskLevel.UNKNOWN
    
    if wind_mph is not None and load_lbs is not None:
        adjusted_wind_risk = apply_load_rules(wind_mph, load_lbs, wind_risk)
    else:
        adjusted_wind_risk = wind_risk
        
    risks = [r for r in [adjusted_wind_risk, rain_risk, snow_risk] if r != RiskLevel.UNKNOWN]
    
    if not risks:
        final_risk = RiskLevel.UNKNOWN
    else:
        final_risk = max(risks)
        
    return {
        "wind_risk": wind_risk,
        "adjusted_wind_risk": adjusted_wind_risk,
        "rain_risk": rain_risk,
        "snow_risk": snow_risk,
        "final_risk": final_risk
    }
