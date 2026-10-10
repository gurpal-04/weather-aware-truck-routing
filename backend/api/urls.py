from django.urls import path
from .views import BuildRoutesView, ScoreRoutesView, AnalyzeRoutesView, WeatherForecastView

urlpatterns = [
    path('routes/build/', BuildRoutesView.as_view(), name='build_routes'),
    path('routes/score/', ScoreRoutesView.as_view(), name='score_routes'),
    path('routes/analyze/', AnalyzeRoutesView.as_view(), name='analyze_routes'),
    path('weather/forecast/', WeatherForecastView.as_view(), name='weather_forecast'),
]
