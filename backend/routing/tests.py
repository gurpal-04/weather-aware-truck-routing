import pytest
from .checkpoints import haversine, interpolate_point, generate_checkpoints

def test_haversine_distance():
    # NYC (approx 40.7128, -74.0060) to Philadelphia (approx 39.9526, -75.1652) ~ 80 miles
    dist = haversine(-74.0060, 40.7128, -75.1652, 39.9526)
    assert 75 < dist < 85

def test_interpolate_point():
    p = interpolate_point(-74.0, 40.0, -72.0, 42.0, 0.5)
    assert p == (-73.0, 41.0)

def test_generate_checkpoints():
    coords = [[-74.0, 40.0], [-73.0, 40.0], [-72.0, 40.0]]
    checkpoints = generate_checkpoints(coords, interval_miles=25, total_duration_seconds=3600)
    
    assert len(checkpoints) >= 3
    # First checkpoint should match route origin
    assert checkpoints[0]["lon"] == -74.0
    assert checkpoints[0]["lat"] == 40.0
    assert checkpoints[0]["cumulative_distance"] == 0.0

def test_generate_checkpoints_empty():
    assert generate_checkpoints([], 25, 0) == []
