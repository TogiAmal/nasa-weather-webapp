# NASA Weather Likelihood App - Starter Project

This repository is a **starter kit** for a Weather Likelihood App that uses historical NASA Earth observation data
(e.g., NASA POWER, GPM, MERRA-2) to compute the probability of "very hot", "very cold", "very wet", "very windy",
or "very uncomfortable" conditions for a given location and day of year.

## What's included
- `backend/` - FastAPI backend with example endpoints:
    - `/health` - health check
    - `/query` - example endpoint that fetches NASA POWER data for a point and computes simple probabilities
- `frontend/` - React skeleton (minimal) with a map-like UI (placeholder) and form to query the backend.
- `scripts/` - helper script demonstrating how to fetch NASA POWER data and compute probability thresholds.
- `data/sample.csv` - small sample CSV showing expected output format.
- `Dockerfile` - for containerizing the backend.
- `README.md` - this file.

## Quickstart (local)

### Backend
1. Create and activate a Python virtualenv:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```
2. Run the FastAPI app:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
3. Open `http://localhost:8000/docs` to see automatic API docs.

### Frontend
The `frontend` folder is a minimal React app. To run:
```bash
cd frontend
npm install
npm start
```
The frontend is deliberately minimal and can be extended to include a proper map (Leaflet/Mapbox).

## Notes
- The backend uses the NASA POWER REST API as an example. You should inspect NASA APIs and pick the datasets that best serve your needs.
- This starter project focuses on architecture and structure. For "maximum prediction and accuracy" you'll want to:
  - ingest longer time-series datasets (MERRA-2, GPM, MODIS)
  - precompute climatologies (30-year normals) and extreme indices (ETCCDI)
  - add caching, batching, rate-limit handling, and pagination
  - include unit tests and CI

## License
This starter project is provided as-is for educational use.
