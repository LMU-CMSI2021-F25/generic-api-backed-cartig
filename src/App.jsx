// src/App.jsx
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. Correctly import the 'getDataForLocation' function
import { getDataForLocation } from './services/taxService';

// Icon fix (same as before)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng);
    },
  });
  return position === null ? null : <Marker position={position}></Marker>;
}

function App() {
  // 2. Add state for the new fallback message
  const [taxData, setTaxData] = useState(null);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);

  // 3. Update the handler to use the new function and handle its response
  const handleMapClick = async (latlng) => {
    setLoading(true);
    setError(null);
    setTaxData(null);
    setFallbackMessage('');
    setSelectedPosition(latlng);

    try {
      // Call the correctly named function
      const result = await getDataForLocation(latlng);

      // Check the success flag in the result object
      if (result.success) {
        setTaxData(result.data);
      } else {
        setFallbackMessage(`No sales tax data found. This location is in ${result.fallbackLocation}.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Update the JSX to display the fallback message when needed
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ flex: 3, position: 'relative' }}>
        <MapContainer center={[39.82, -98.57]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker onLocationSelect={handleMapClick} />
          {taxData && (
            <Popup position={[selectedPosition.lat, selectedPosition.lng]}>
              <div>
                <h4>Sales Tax: {(taxData.total_rate * 100).toFixed(2)}%</h4>
                <p><strong>ZIP Code:</strong> {taxData.zip_code}</p>
              </div>
            </Popup>
          )}
        </MapContainer>
      </div>
      <div style={{ flex: 1, padding: '20px', background: '#f4f4f4', overflowY: 'auto' }}>
        <h2>Sales Tax Mapper 💵</h2>
        <p>Click anywhere on the map to find the sales tax for that location.</p>
        
        {loading && <p>Loading location data...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {fallbackMessage && <p style={{ color: '#555' }}>{fallbackMessage}</p>}

        {taxData && (
          <div>
            <h3>Results for ZIP Code: {taxData.zip_code}</h3>
            <p><strong>Total Rate:</strong> {(taxData.total_rate * 100).toFixed(4)}%</p>
            <p><strong>State Rate:</strong> {(taxData.state_rate * 100).toFixed(4)}%</p>
            <p><strong>City Rate:</strong> {(taxData.city_rate * 100).toFixed(4)}%</p>
            <p><strong>County Rate:</strong> {(taxData.county_rate * 100).toFixed(4)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;