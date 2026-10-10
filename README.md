# Weather-Aware Truck Routing

## Overview
This is a full-stack web application designed to help truck drivers compare routes based on weather conditions, truck load weight, and travel time. It automatically checks weather at intervals along the route and aggregates the risk.

## Tech Stack
* **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Map GL (MapLibre GL JS)
* **Backend**: Python, Django, Django REST Framework, Pytest

## Local Setup
1. **Clone the repository.**
2. **Setup Backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```
3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Environment Variables
Copy `.env.example` to `.env` in the root directory.
* `ORS_API_KEY`: OpenRouteService API Key (Required for real routing)
* `VITE_API_BASE_URL`: Backend URL (default: http://localhost:8000)

## Design Decisions and Risk Thresholds
### Weather
* **Wind**: <25 Low, 25-34 Moderate, 35-44 High, 45-54 Severe, >=55 No Travel. Overlapping boundaries favor more severe (e.g., exactly 35 is High).
* **Rain**: <0.10 Low, 0.10-0.25 Moderate, 0.25-0.50 High, 0.50-1.00 Severe, >1.00 No Travel.
* **Snow**: <0.5 Low, 0.5-1.0 Moderate, 1.0-2.0 High, 2.0-3.0 Severe, >3.0 No Travel.

### Load Overrides
* >= 55 mph wind is No Travel for all.
* 45-54 mph + >30,000 lbs = No Travel.
* 35-44 mph + >40,000 lbs = Severe.

### Routing & ETAs
* We calculate checkpoints using Haversine interpolation.
* Arrival times are estimated using a distance-weighted duration calculation since ORS provides total duration.

### Heatmap
* The forecast slider offset changes the time evaluated on the map, updating weather risk visualization.

## Tests
Run tests using:
```bash
cd backend
pytest risk/tests.py api/tests.py
```

## Known Limitations
* Real-world route instructions are skipped to save processing time.
* If ORS key is absent, you will get a 502 error during API request.

## Walkthrough Script
1. **Introduction:** "Hi, this is a walkthrough of the Weather-Aware Truck Routing app. It helps drivers avoid unsafe weather by comparing routes and load limits."
2. **Trip Entry:** "Here in the trip form, I can enter origin and destination coordinates, departure time, and my truck's load weight."
3. **Route Comparison:** "After clicking analyze, the backend fetches up to 3 alternative routes, interpolates checkpoints, and queries Open-Meteo for the estimated arrival time at each point. Here we see the recommended route prioritized by fewest severe miles and lowest average risk."
4. **Checkpoint Inspection:** "On the map, I can click a checkpoint to see the wind, rain, and snow rates for my ETA, and how the risk was calculated."
5. **Load Overrides:** "Notice that because our truck is 45,000 lbs, a 40 mph wind that normally would be High risk is upgraded to Severe."
6. **Recommendation Logic:** "The panel clearly distinguishes routes with 'No Travel' segments as unsafe, pushing them to the bottom."
7. **Forecast Slider:** "Using the slider at the bottom, I can fast-forward the weather forecast up to 48 hours to see how delaying the trip would change conditions along the corridor."
8. **Conclusion:** "The backend relies on Django with a clean separation of concerns, heavily unit tested for all edge cases in the risk model."
