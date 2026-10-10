from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timezone
from routing.providers import get_routes, RoutingProviderError, geocode
from routing.checkpoints import generate_checkpoints
from weather.providers import fetch_weather_for_checkpoints, WeatherProviderError, fetch_weather_forecast
from risk.classifier import calculate_checkpoint_risk
from risk.scoring import aggregate_route_risk, rank_routes

class AnalyzeRoutesView(APIView):
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
            
            dep_time_str = data['departure_time']
            departure_time = datetime.fromisoformat(dep_time_str.replace('Z', '+00:00'))
            
            load_weight = float(data['load_weight'])
            interval_miles = float(data.get('interval_miles', 10))
            
            if interval_miles not in [10, 25, 50]:
                return Response({"error": "interval_miles must be 10, 25, or 50"}, status=status.HTTP_400_BAD_REQUEST)
                
        except (KeyError, ValueError, TypeError) as e:
            return Response({"error": f"Invalid request parameters: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            routes = get_routes(start_lon, start_lat, end_lon, end_lat)
        except RoutingProviderError as e:
            # Let's mock a route if we hit API error for the MVP testing
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # Process each route
        processed_routes = []
        for route in routes:
            checkpoints = generate_checkpoints(route['coordinates'], interval_miles, route['duration_seconds'])
            
            try:
                weather_data = fetch_weather_for_checkpoints(checkpoints, departure_time)
            except WeatherProviderError as e:
                return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
                
            for cp, wd in zip(checkpoints, weather_data):
                cp.update(wd)
                risk_res = calculate_checkpoint_risk(
                    wind_mph=wd['wind_mph'],
                    rain_in_hr=wd['rain_in_hr'],
                    snow_in_hr=wd['snow_in_hr'],
                    load_lbs=load_weight
                )
                cp.update(risk_res)
                
            summary = aggregate_route_risk(checkpoints, route['distance_miles'], route['duration_seconds'])
            
            processed_routes.append({
                "id": route['id'],
                "coordinates": route['coordinates'],
                "distance_miles": route['distance_miles'],
                "duration_seconds": route['duration_seconds'],
                "checkpoints": checkpoints,
                "summary": summary
            })
            
        ranked_routes = rank_routes(processed_routes)
        
        return Response({"routes": ranked_routes})


class WeatherForecastView(APIView):
    def get(self, request):
        try:
            lats = [float(x) for x in request.query_params.get('lats', '').split(',') if x]
            lons = [float(x) for x in request.query_params.get('lons', '').split(',') if x]
            target_time_str = request.query_params.get('target_time')
            load_weight = float(request.query_params.get('load_weight', 40000))
            
            if len(lats) != len(lons) or not lats:
                return Response({"error": "Invalid coordinates"}, status=status.HTTP_400_BAD_REQUEST)
                
            target_time = datetime.fromisoformat(target_time_str.replace('Z', '+00:00'))
            
            checkpoints = [{"lat": lat, "lon": lon} for lat, lon in zip(lats, lons)]
            
            weather_data = fetch_weather_forecast(checkpoints, target_time)
            
            # Apply risk calculation
            for cp, wd in zip(checkpoints, weather_data):
                risk_res = calculate_checkpoint_risk(
                    wind_mph=wd.get('wind_mph'),
                    rain_in_hr=wd.get('rain_in_hr'),
                    snow_in_hr=wd.get('snow_in_hr'),
                    load_lbs=load_weight
                )
                wd.update(risk_res)
                
            return Response({"data": weather_data})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
