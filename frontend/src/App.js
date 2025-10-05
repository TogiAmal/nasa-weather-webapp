import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Fix for default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function ChangeMapView({ coords }) {
  const map = useMap();
  map.setView(coords, 10); // Zoom in a bit closer on search
  return null;
}

function App() {
  const [activeTab, setActiveTab] = useState('prompt');
  const [prompt, setPrompt] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapPosition, setMapPosition] = useState([20, 0]);

  const clearState = () => {
    setError('');
    setWeatherData(null);
    setLoading(true);
  };

  const handlePromptSearch = async (e) => {
    e.preventDefault();
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }
    clearState();
    try {
      const response = await fetch('http://localhost:8000/process-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to process prompt.');
      }
      const result = await response.json();
      setWeatherData(result);
      setMapPosition([result.location.lat, result.location.lon]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!location || !date) {
      setError('Please enter a location and select a date.');
      return;
    }
    clearState();
    try {
      const geocodeRes = await fetch(`http://localhost:8000/geocode?q=${encodeURIComponent(location)}`);
      if (!geocodeRes.ok) throw new Error('Location not found.');
      const geoData = await geocodeRes.json();
      fetchWeatherForCoords(geoData.lat, geoData.lon, date, geoData.name);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };
  
  // NEW: Function to handle the "Use My Location" button
  const handleCurrentLocation = () => {
    if (!date) {
      setError("Please select a date first.");
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        // Switch to manual tab and update text for clarity
        setActiveTab('manual');
        setLocation('My Current Location');
        fetchWeatherForCoords(latitude, longitude, date, 'My Current Location');
      }, () => {
        setError("Could not get your location. Please enable location services.");
      });
    }
  };

  // Helper function to fetch weather, used by both manual and current location search
  const fetchWeatherForCoords = async (lat, lon, selectedDate, locationName) => {
    clearState();
    try {
      const [year, month, day] = selectedDate.split('-');
      const queryPayload = { lat, lon, month: parseInt(month), day: parseInt(day) };
      const weatherRes = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryPayload),
      });
      if (!weatherRes.ok) throw new Error('Could not fetch weather data.');
      
      const weatherResult = await weatherRes.json();
      weatherResult.found_location = locationName;
      weatherResult.found_date = selectedDate;
      
      setWeatherData(weatherResult);
      setMapPosition([weatherResult.location.lat, weatherResult.location.lon]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="app-container">
      <div className="panel">
        <h1>ClimaScope 🌦️</h1>
        
        <div className="tab-container">
          <button className={`tab-button ${activeTab === 'prompt' ? 'active' : ''}`} onClick={() => setActiveTab('prompt')}>
            Smart Search
          </button>
          <button className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
            Manual Search
          </button>
        </div>

        {activeTab === 'prompt' && (
          <form onSubmit={handlePromptSearch}>
            <p>Ask a question like: "Will it rain in Neeloor on September 2nd?"</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your question here..."
              rows="3"
            />
            <button type="submit" disabled={loading}>Get Likelihood</button>
          </form>
        )}

        {activeTab === 'manual' && (
          <form onSubmit={handleManualSearch}>
            <p>Enter a location and date to find its historical weather likelihood.</p>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Paris, France"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button type="submit" disabled={loading}>Search</button>
          </form>
        )}

        {/* NEW: Added the "Use My Location" button back */}
        <button className="location-btn" onClick={handleCurrentLocation}>Use My Location</button>

        <div className="results">
          {loading && <p>Analyzing and fetching data...</p>}
          {error && <p className="error">{error}</p>}
          {weatherData && (
            <div className="weather-card">
              <h3>Weather Likelihood for {weatherData.found_location.split(',')[0]} on {weatherData.found_date}</h3>
              <div className="stat">
                <strong>Chance of Rain:</strong>
                <span className="rain-chance">{Math.round(weatherData.chance_of_rain * 100)}%</span>
              </div>
              <div className="stat">
                <strong>Average Temperature:</strong>
                <span>{weatherData.avg_temp_celsius}°C</span>
              </div>
              <small>Based on {weatherData.samples_found} samples from the last 30 years.</small>
            </div>
          )}
        </div>
      </div>
      <div className="map-container">
        <MapContainer center={mapPosition} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {weatherData && <Marker position={[weatherData.location.lat, weatherData.location.lon]} />}
          {weatherData && <ChangeMapView coords={[weatherData.location.lat, weatherData.location.lon]} />}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;