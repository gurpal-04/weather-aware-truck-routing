import pytest
from .classifier import RiskLevel, classify_wind, classify_rain, classify_snow, apply_load_rules, calculate_checkpoint_risk
from .scoring import aggregate_route_risk, rank_routes

def test_classify_wind():
    assert classify_wind(24.9) == RiskLevel.LOW
    assert classify_wind(25) == RiskLevel.MODERATE
    assert classify_wind(34) == RiskLevel.MODERATE
    assert classify_wind(35) == RiskLevel.HIGH
    assert classify_wind(44) == RiskLevel.HIGH
    assert classify_wind(45) == RiskLevel.SEVERE
    assert classify_wind(54) == RiskLevel.SEVERE
    assert classify_wind(55) == RiskLevel.NO_TRAVEL
    assert classify_wind(60) == RiskLevel.NO_TRAVEL
    assert classify_wind(None) == RiskLevel.UNKNOWN

def test_classify_rain():
    assert classify_rain(0.09) == RiskLevel.LOW
    assert classify_rain(0.10) == RiskLevel.MODERATE
    assert classify_rain(0.25) == RiskLevel.MODERATE
    assert classify_rain(0.26) == RiskLevel.HIGH
    assert classify_rain(0.49) == RiskLevel.HIGH
    assert classify_rain(0.50) == RiskLevel.SEVERE
    assert classify_rain(1.00) == RiskLevel.SEVERE
    assert classify_rain(1.01) == RiskLevel.NO_TRAVEL
    assert classify_rain(None) == RiskLevel.UNKNOWN

def test_classify_snow():
    assert classify_snow(0.4) == RiskLevel.LOW
    assert classify_snow(0.5) == RiskLevel.MODERATE
    assert classify_snow(1.0) == RiskLevel.MODERATE
    assert classify_snow(1.1) == RiskLevel.HIGH
    assert classify_snow(1.9) == RiskLevel.HIGH
    assert classify_snow(2.0) == RiskLevel.SEVERE
    assert classify_snow(3.0) == RiskLevel.SEVERE
    assert classify_snow(3.1) == RiskLevel.NO_TRAVEL
    assert classify_snow(None) == RiskLevel.UNKNOWN

def test_load_rules():
    # Wind >=55 mph at every load
    assert apply_load_rules(55, 10000, RiskLevel.NO_TRAVEL) == RiskLevel.NO_TRAVEL
    assert apply_load_rules(60, 45000, RiskLevel.NO_TRAVEL) == RiskLevel.NO_TRAVEL
    
    # Wind 45–54 mph at loads of 30,000 lb and just above 30,000 lb
    assert apply_load_rules(45, 30000, RiskLevel.SEVERE) == RiskLevel.SEVERE
    assert apply_load_rules(45, 30001, RiskLevel.SEVERE) == RiskLevel.NO_TRAVEL
    assert apply_load_rules(54, 40000, RiskLevel.SEVERE) == RiskLevel.NO_TRAVEL
    
    # Wind 35–44 mph at loads of 40,000 lb and just above 40,000 lb
    assert apply_load_rules(35, 40000, RiskLevel.HIGH) == RiskLevel.HIGH
    assert apply_load_rules(35, 40001, RiskLevel.HIGH) == RiskLevel.SEVERE
    assert apply_load_rules(44, 45000, RiskLevel.HIGH) == RiskLevel.SEVERE

def test_calculate_checkpoint_risk():
    # Cases where rain or snow creates a more severe risk than wind
    res = calculate_checkpoint_risk(wind_mph=10, rain_in_hr=1.5, snow_in_hr=0, load_lbs=10000)
    assert res['final_risk'] == RiskLevel.NO_TRAVEL
    
    # Combined weather and load overrides
    res = calculate_checkpoint_risk(wind_mph=36, rain_in_hr=0.1, snow_in_hr=0, load_lbs=45000)
    # Wind 36 -> High. Load > 40k -> Severe. Rain 0.1 -> Moderate. Final -> Severe
    assert res['adjusted_wind_risk'] == RiskLevel.SEVERE
    assert res['final_risk'] == RiskLevel.SEVERE

def test_rank_routes():
    r1 = {
        "id": 1,
        "summary": {
            "is_unsafe": False,
            "miles_severe": 10,
            "miles_high": 20,
            "average_risk": 1.5,
            "total_duration": 3600,
            "total_distance": 100,
            "missing_data": False
        }
    }
    r2 = {
        "id": 2,
        "summary": {
            "is_unsafe": False,
            "miles_severe": 5, # Fewest severe miles
            "miles_high": 30,
            "average_risk": 2.0,
            "total_duration": 4000,
            "total_distance": 120,
            "missing_data": False
        }
    }
    r3 = {
        "id": 3,
        "summary": {
            "is_unsafe": False,
            "miles_severe": 5,
            "miles_high": 15, # Tie-breaker on high miles
            "average_risk": 1.8,
            "total_duration": 4200,
            "total_distance": 110,
            "missing_data": False
        }
    }
    r4 = {
        "id": 4,
        "summary": {
            "is_unsafe": True, # Unsafe, should be last
            "miles_severe": 0,
            "miles_high": 0,
            "average_risk": 0.5,
            "total_duration": 3000,
            "total_distance": 90,
            "missing_data": False
        }
    }
    
    ranked = rank_routes([r1, r2, r3, r4])
    assert ranked[0]['id'] == 3 # Severe:5, High:15
    assert ranked[1]['id'] == 2 # Severe:5, High:30
    assert ranked[2]['id'] == 1 # Severe:10
    assert ranked[3]['id'] == 4 # Unsafe
