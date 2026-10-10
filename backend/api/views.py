from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timezone
from routing.providers import get_routes, RoutingProviderError, geocode
from routing.checkpoints import generate_checkpoints
from weather.providers import fetch_weather_for_checkpoints, WeatherProviderError, fetch_weather_forecast
from risk.classifier import calculate_checkpoint_risk
from risk.scoring import aggregate_route_risk, rank_routes

class BuildRoutesView(APIView):
    def post(self, request):
        data = request.data
        try:
            if 'origin' in data and 'destination' in data:
                try:
                    start_lon, start_lat = geocode(data['origin'])
                    end_lon, end_lat = geocode(data['destination'])
                except RoutingProviderError as e:
                    return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            else:
                start_lat = float(data['start_lat'])
                start_lon = float(data['start_lon'])
                end_lat = float(data['end_lat'])
                end_lon = float(data['end_lon'])
            
            interval_miles = float(data.get('interval_miles', 10))
        except (KeyError, ValueError, TypeError) as e:
            return Response({"error": f"Invalid request parameters: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            routes = get_routes(start_lon, start_lat, end_lon, end_lat)
        except RoutingProviderError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        processed_routes = []
        for route in routes:
            checkpoints = generate_checkpoints(route['coordinates'], interval_miles, route['duration_seconds'])
            processed_routes.append({
                "id": route['id'],
                "coordinates": route['coordinates'],
                "distance_miles": route['distance_miles'],
                "duration_seconds": route['duration_seconds'],
                "checkpoints": checkpoints
            })
            
        return Response({"routes": processed_routes})

class ScoreRoutesView(APIView):
    def post(self, request):
        data = request.data
        routes = data.get('routes', [])
        load_weight = float(data.get('load_weight', 40000))
        
        processed_routes = []
        for route in routes:
            checkpoints = route.get('checkpoints', [])
            for cp in checkpoints:
                risk_res = calculate_checkpoint_risk(
                    wind_mph=cp.get('wind_mph'),
                    rain_in_hr=cp.get('rain_in_hr'),
                    snow_in_hr=cp.get('snow_in_hr'),
                    load_lbs=load_weight
                )
                cp.update(risk_res)
                
            summary = aggregate_route_risk(checkpoints, route.get('distance_miles', 0), route.get('duration_seconds', 0))
            route['summary'] = summary
            processed_routes.append(route)
            
        ranked_routes = rank_routes(processed_routes)
        return Response({"routes": ranked_routes})

# Legacy view just in case
class AnalyzeRoutesView(APIView):
    def post(self, request):
        return Response({"error": "Deprecated. Use /build/ and /score/ flow instead."}, status=status.HTTP_400_BAD_REQUEST)

class WeatherForecastView(APIView):
    def get(self, request):
        return Response({"error": "Deprecated. Fetch from frontend directly."}, status=status.HTTP_400_BAD_REQUEST)
