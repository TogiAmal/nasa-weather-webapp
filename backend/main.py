from fastapi import FastAPI, HTTPException, Query as FastQuery
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
import requests
import datetime
import numpy as np
from collections import defaultdict
import spacy
from dateutil.parser import parse

# Load the large spaCy model
nlp = spacy.load("en_core_web_lg")

app = FastAPI(title="ClimaScope API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Prompt(BaseModel):
    text: str

class Query(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)

def parse_power_data(data: dict, month: int, day: int):
    try:
        params = defaultdict(dict, data['properties']['parameter'])
        t2m = params['T2M']
        prectot = params['PRECTOTCORR']
    except KeyError:
        raise HTTPException(status_code=500, detail="Unexpected API response.")
    daily_data = {'temps': [], 'precs': []}
    for date_str, temp in t2m.items():
        if int(date_str[4:6]) == month and int(date_str[6:8]) == day:
            daily_data['temps'].append(float(temp))
            if date_str in prectot:
                daily_data['precs'].append(float(prectot[date_str]))
    for key in daily_data:
        daily_data[key] = np.array(daily_data[key], dtype=float)
        daily_data[key] = daily_data[key][daily_data[key] > -99]
    return daily_data

@app.get("/geocode")
def geocode_location(q: str = FastQuery(..., min_length=2)):
    headers = {'User-Agent': 'ClimaScopeApp/1.0 (test@example.com)'}
    params = {'q': q, 'format': 'json', 'limit': 1}
    try:
        resp = requests.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if not results:
            raise HTTPException(status_code=404, detail=f"Location '{q}' not found.")
        top_result = results[0]
        return {"name": top_result.get("display_name"), "lat": float(top_result.get("lat")), "lon": float(top_result.get("lon"))}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to geocoding service: {e}")

@app.post('/query')
def query(q: Query):
    end_year = datetime.date.today().year - 1
    start_year = end_year - 30
    params = {
        'start': f"{start_year}0101", 'end': f"{end_year}1231", 'latitude': q.lat,
        'longitude': q.lon, 'community': 'AG', 'parameters': 'T2M,PRECTOTCORR',
        'format': 'JSON', 'temporal-average': 'DAILY'
    }
    try:
        resp = requests.get('https://power.larc.nasa.gov/api/temporal/daily/point', params=params, timeout=30)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch from NASA POWER: {e}")
    json_data = resp.json()
    daily_data = parse_power_data(json_data, q.month, q.day)
    temps, precs = daily_data['temps'], daily_data['precs']
    if len(temps) < 5:
        raise HTTPException(status_code=404, detail="Insufficient historical data for this location.")
    prob_any_rain = np.mean(precs > 1.0)
    return {
        'location': {'lat': q.lat, 'lon': q.lon},
        'samples_found': len(temps),
        'chance_of_rain': round(prob_any_rain, 3),
        'avg_temp_celsius': round(np.mean(temps), 2),
    }

@app.post("/process-prompt")
def process_prompt(prompt: Prompt):
    doc = nlp(prompt.text)
    location_text = None
    date_obj = None
    for ent in doc.ents:
        if ent.label_ in ["GPE", "LOC"] and not location_text:
            location_text = ent.text
        if ent.label_ == "DATE" and not date_obj:
            try:
                date_obj = parse(ent.text)
            except ValueError:
                continue
    if not location_text or not date_obj:
        raise HTTPException(status_code=400, detail="Could not identify a location and a date in the prompt.")
    try:
        geo_res = requests.get(f"https://nominatim.openstreetmap.org/search?q={location_text}&format=json&limit=1", headers={'User-Agent': 'ClimaScopeApp/1.0'}).json()
        if not geo_res: raise ValueError("Location not found")
        lat, lon = float(geo_res[0]["lat"]), float(geo_res[0]["lon"])
    except Exception:
        raise HTTPException(status_code=404, detail=f"Could not find coordinates for '{location_text}'.")
    weather_result = query(Query(lat=lat, lon=lon, month=date_obj.month, day=date_obj.day))
    return {
        'found_location': location_text,
        'found_date': date_obj.strftime("%Y-%m-%d"),
        **weather_result
    }