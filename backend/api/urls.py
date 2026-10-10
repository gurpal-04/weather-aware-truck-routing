from django.urls import path
from .views import AnalyzeRoutesView, WeatherForecastView

urlpatterns = [
    path('routes/analyze/', AnalyzeRoutesView.as_view(), name='analyze_routes'),
    path('weather/forecast/', WeatherForecastView.as_view(), name='weather_forecast'),
]
