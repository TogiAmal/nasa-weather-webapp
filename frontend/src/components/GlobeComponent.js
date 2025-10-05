// src/components/GlobeComponent.js

import React, { useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';

const GlobeComponent = ({ onLocationSelect }) => {
  // useRef gives us access to the globe instance to control it
  const globeEl = useRef();

  // This function will be called by our button
  const zoomToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;

        // Animate the globe to the new coordinates
        globeEl.current.pointOfView(
          { lat: latitude, lng: longitude, altitude: 0.5 }, // altitude 0.5 is closer, 2.5 is further away
          1500 // Animation duration in milliseconds (1.5 seconds)
        );
        
        // Pass the location to the parent component to fetch weather data
        onLocationSelect({ lat: latitude, lon: longitude });

      }, () => {
        alert("Could not get your location. Please enable location services.");
      });
    }
  };
  
  // Use useEffect to make the globe responsive to the container size
  useEffect(() => {
    if (globeEl.current) {
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.2;
    }
  }, []);


  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
        backgroundColor="#000010"
        onGlobeClick={({ lat, lng }) => onLocationSelect({ lat, lon: lng })} // Allow clicking globe to select
      />
      <button 
        onClick={zoomToCurrentLocation}
        style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '20px', 
            zIndex: 1,
            padding: '10px',
            cursor: 'pointer'
        }}
      >
        Use My Location
      </button>
    </div>
  );
};

export default GlobeComponent;