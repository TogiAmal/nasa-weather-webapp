// src/components/WeatherResults.js

import React from 'react';

const WeatherResults = ({ data }) => {
  if (!data) {
    return <div>Select a location and date to see the weather likelihood.</div>;
  }

  const { probabilities, statistics } = data;

  // Convert probability (0.0 to 1.0) to percentage
  const toPercent = (prob) => Math.round(prob * 100);

  return (
    <div className="weather-card">
      <h2>Weather Likelihood</h2>
      <p>
        Mean Temperature: <strong>{statistics.temperature_celsius.mean}°C</strong>
      </p>
      
      <hr />

      <h3>Rain Probability</h3>
      <p>
        Chance of a mostly DRY day: <strong>{toPercent(probabilities.mostly_dry)}%</strong>
      </p>
      <p>
        Chance of a VERY WET day: <strong>{toPercent(probabilities.very_wet)}%</strong>
      </p>

      {/* You can add more stats here */}
    </div>
  );
};

export default WeatherResults;