"""Example script: fetch NASA POWER data for a specific location and date range,
compute simple probabilities for extreme thresholds.
"""

import requests, datetime, numpy as np

def fetch_power(lat, lon, start_date, end_date):
    params = {
        'start': start_date.replace('-', ''),
        'end': end_date.replace('-', ''),
        'latitude': lat,
        'longitude': lon,
        'community': 'AG',
        'parameters': 'T2M,PRECTOTCORR',
        'format': 'JSON',
        'temporalAverage': 'DAILY'
    }
    r = requests.get('https://power.larc.nasa.gov/api/temporal/daily/point', params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def compute_probabilities(json_data, month, day):
    t2m = json_data['properties']['parameter']['T2M']
    pr = json_data['properties']['parameter']['PRECTOTCORR']
    temps = []
    precs = []
    for date_iso, temp in t2m.items():
        mm = int(date_iso[4:6])
        dd = int(date_iso[6:8])
        if mm == month and dd == day:
            temps.append(temp)
            precs.append(pr.get(date_iso, 0.0))
    if len(temps) == 0:
        # fallback to monthly agg
        temps = list(t2m.values())
        precs = list(pr.values())
    temps = np.array(temps, dtype=float)
    precs = np.array(precs, dtype=float)
    return {
        'prob_hot': float((temps > 32.0).sum())/len(temps),
        'prob_cold': float((temps < 0.0).sum())/len(temps),
        'prob_wet': float((precs > 10.0).sum())/len(precs)
    }

if __name__ == '__main__':
    lat, lon = 28.6139, 77.2090
    today = datetime.date.today()
    start = f"{today.year-30}0101"
    end = f"{today.year-1}1231"
    print('Fetching', lat, lon, start, end)
    data = fetch_power(lat, lon, f"{today.year-30}-01-01", f"{today.year-1}-12-31")
    out = compute_probabilities(data, today.month, today.day)
    print('Probabilities:', out)
