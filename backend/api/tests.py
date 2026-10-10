import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from datetime import datetime, timezone

@pytest.fixture
def client():
    return APIClient()

@patch('api.views.get_routes')
@patch('api.views.fetch_weather_for_checkpoints')
def test_analyze_routes_success(mock_fetch_weather, mock_get_routes, client):
    mock_get_routes.return_value = [
        {
            "id": "route_0",
            "distance_miles": 100,
            "duration_seconds": 3600,
            "coordinates": [[-74.0, 40.7], [-73.0, 41.7]]
        }
    ]
    
    mock_fetch_weather.return_value = [
        {"wind_mph": 10, "rain_in_hr": 0, "snow_in_hr": 0, "timestamp": "2023-10-25T00:00:00Z"},
        {"wind_mph": 10, "rain_in_hr": 0, "snow_in_hr": 0, "timestamp": "2023-10-25T01:00:00Z"}
    ]
    
    response = client.post('/api/routes/analyze/', {
        "start_lat": 40.7,
        "start_lon": -74.0,
        "end_lat": 41.7,
        "end_lon": -73.0,
        "departure_time": "2023-10-25T00:00:00Z",
        "load_weight": 40000,
        "interval_miles": 50
    }, format='json')
    
    assert response.status_code == 200
    data = response.json()
    assert "routes" in data
    assert len(data["routes"]) == 1
    assert data["routes"][0]["id"] == "route_0"
    
def test_analyze_routes_missing_params(client):
    response = client.post('/api/routes/analyze/', {}, format='json')
    assert response.status_code == 400
