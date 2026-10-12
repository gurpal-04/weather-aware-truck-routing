import pytest
from datetime import datetime, timezone
from unittest.mock import patch
from .providers import chunk_list, fetch_weather_for_checkpoints

def test_chunk_list():
    items = list(range(10))
    chunks = list(chunk_list(items, 3))
    assert len(chunks) == 4
    assert chunks[0] == [0, 1, 2]
    assert chunks[-1] == [9]

def test_fetch_weather_empty():
    assert fetch_weather_for_checkpoints([], datetime.now(timezone.utc)) == []

@patch('weather.providers._fetch_chunk')
def test_fetch_weather_success(mock_fetch_chunk):
    mock_fetch_chunk.return_value = [
        {
            "hourly": {
                "time": ["2023-10-25T00:00", "2023-10-25T01:00"],
                "wind_speed_10m": [15.0, 20.0],
                "precipitation": [0.0, 0.1],
                "snowfall": [0.0, 0.0]
            }
        }
    ]

    checkpoints = [{"lat": 40.0, "lon": -74.0, "eta_offset_seconds": 0}]
    dep_time = datetime(2023, 10, 25, 0, 0, tzinfo=timezone.utc)
    
    results = fetch_weather_for_checkpoints(checkpoints, dep_time)
    assert len(results) == 1
    assert results[0]["wind_mph"] == 15.0
    assert results[0]["rain_in_hr"] == 0.0
