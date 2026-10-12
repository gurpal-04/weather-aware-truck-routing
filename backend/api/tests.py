import pytest
from unittest.mock import patch
from rest_framework.test import APIClient

@pytest.fixture
def client():
    return APIClient()

@patch('api.views.get_routes')
def test_build_routes_success(mock_get_routes, client):
    mock_get_routes.return_value = [
        {
            "id": "route_0",
            "distance_miles": 100,
            "duration_seconds": 3600,
            "coordinates": [[-74.0, 40.7], [-73.0, 41.7]]
        }
    ]

    response = client.post('/api/routes/build/', {
        "start_lat": 40.7,
        "start_lon": -74.0,
        "end_lat": 41.7,
        "end_lon": -73.0,
        "interval_miles": 50
    }, format='json')

    assert response.status_code == 200
    data = response.json()
    assert "routes" in data
    assert len(data["routes"]) == 1
    assert data["routes"][0]["id"] == "route_0"
    assert "checkpoints" in data["routes"][0]

def test_score_routes_success(client):
    payload = {
        "load_weight": 45000,
        "routes": [
            {
                "id": "route_0",
                "distance_miles": 100,
                "duration_seconds": 3600,
                "checkpoints": [
                    {
                        "lat": 40.7,
                        "lon": -74.0,
                        "wind_mph": 40.0,
                        "rain_in_hr": 0.0,
                        "snow_in_hr": 0.0,
                        "distance_from_prev": 50
                    }
                ]
            }
        ]
    }

    response = client.post('/api/routes/score/', payload, format='json')
    assert response.status_code == 200
    data = response.json()
    assert "routes" in data
    scored_route = data["routes"][0]
    # 40 mph wind + 45k lbs load should override to SEVERE (level 3)
    assert scored_route["checkpoints"][0]["final_risk"] == 3
    assert "summary" in scored_route

def test_build_routes_missing_params(client):
    response = client.post('/api/routes/build/', {}, format='json')
    assert response.status_code == 400
