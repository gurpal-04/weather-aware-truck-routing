# Architecture

## Frontend
- **React (Vite)**: Fast build tool and component-based UI.
- **Tailwind CSS**: Utility-first styling.
- **React Map GL (MapLibre GL JS)**: Renders the GeoJSON checkpoints and lines efficiently using WebGL.
- **State Management**: Simple React state, keeping UI components lightweight.

## Backend
- **Django**: Serves the REST API efficiently.
- **Routing Module (`backend/routing`)**: Adapters for OpenRouteService and checkpoint geometry interpolation.
- **Weather Module (`backend/weather`)**: Adapters for Open-Meteo, including coordinate chunking for bulk requests and time interpolation.
- **Risk Engine (`backend/risk`)**: Pure Python implementation of the business rules for weather risk mapping. Fully unit-tested.

## Data Flow
1. User submits coordinates and time.
2. Django view receives request, calls ORS adapter for routes.
3. For each route, checkpoints are interpolated by distance.
4. Checkpoints are passed to Open-Meteo adapter to fetch weather for the exact estimated arrival time.
5. Checkpoints and weather are merged, passed to Risk Engine.
6. Risk Engine calculates individual checkpoint risks and aggregates to a route summary.
7. Routes are ranked lexicographically.
8. Frontend renders the response, separating UI logic from business logic.
