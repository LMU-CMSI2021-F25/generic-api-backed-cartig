// src/App.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getDataForLocation, geocodeLocationByName } from './services/taxService';

// --- Custom SVG Map Marker ---
const customMarkerIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 24" width="32" height="32" fill="#2a9d8f"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  className: 'custom-map-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// --- Helper component to programmatically change the map's view ---
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// --- Helper component to render the animated loading spinner ---
function LoadingSpinner() {
  return <div className="loader"></div>;
}

function LocationMarker({ position, onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return position === null ? null : <Marker position={position} icon={customMarkerIcon}></Marker>;
}

function App() {
  const [resultData, setResultData] = useState(null);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([39.82, -98.57]);
  const [mapZoom, setMapZoom] = useState(4);

  const processResult = (result) => {
    if (result.success) {
      setResultData(result.data);
    } else {
      setFallbackMessage(`No sales tax data found. This location is in ${result.fallbackLocation}.`);
    }
  };

  const handleMapClick = async (latlng) => {
    setLoading(true);
    setError(null);
    setResultData(null);
    setFallbackMessage('');
    setSelectedPosition(latlng);

    try {
      const result = await getDataForLocation(latlng);
      processResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setLoading(true);
    setError(null);
    setResultData(null);
    setFallbackMessage('');

    try {
      const coords = await geocodeLocationByName(searchQuery);
      if (coords) {
        const latlng = { lat: coords.lat, lng: coords.lng };
        setSelectedPosition(latlng);
        setMapCenter(latlng);
        setMapZoom(12);
        const result = await getDataForLocation(latlng);
        processResult(result);
      } else {
        setError(`Could not find location: "${searchQuery}"`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResultData(null);
    setFallbackMessage('');
    setError(null);
    setSelectedPosition(null);
    setMapCenter([39.82, -98.57]);
    setMapZoom(4);
  };

  return (
    <div style={styles.container}>
      <div style={styles.mapContainer}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <ChangeView center={mapCenter} zoom={mapZoom} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <LocationMarker position={selectedPosition} onLocationSelect={handleMapClick} />
          {resultData && selectedPosition && (
            <Popup position={[selectedPosition.lat, selectedPosition.lng]}>
              <div>
                <h4 style={styles.popupTitle}>
                  {resultData.total_rate > 0 ? `Sales Tax: ${(resultData.total_rate * 100).toFixed(2)}%` : 'No Sales Tax'}
                </h4>
                <p style={styles.popupText}><strong>Location:</strong> {resultData.city || resultData.county}, {resultData.state}</p>
              </div>
            </Popup>
          )}
        </MapContainer>
      </div>
      <div style={styles.sidebar}>
        <h2 style={styles.title}>Sales Tax Mapper 💵</h2>
        <p style={styles.subtitle}>Click on the map or search for a location to find its sales tax.</p>
        
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <div style={styles.searchInputContainer}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Portland, OR"
              style={styles.searchInput}
            />
            {searchQuery && (
              <button type="button" onClick={handleClear} style={styles.clearButton}>
                &times;
              </button>
            )}
          </div>
          <button type="submit" style={styles.searchButton}>Search</button>
        </form>
        
        <div style={styles.resultsContainer}>
          {loading && <LoadingSpinner />}
          {error && <p style={styles.errorText}>Error: {error}</p>}
          {fallbackMessage && <p style={styles.infoText}>{fallbackMessage}</p>}

          {resultData && !loading && (
            <div className="results-fade-in">
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Location Details</h3>
                <p><strong>Coordinates:</strong> {resultData.coordinates.lat.toFixed(4)}, {resultData.coordinates.lng.toFixed(4)}</p>
                {resultData.city && <p><strong>City:</strong> {resultData.city}</p>}
                {resultData.county && <p><strong>County:</strong> {resultData.county}</p>}
                <p><strong>State:</strong> {resultData.state}</p>
              </div>
              
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Sales Tax Information</h3>
                {resultData.total_rate > 0 ? (
                  <>
                    {resultData.zip_code && <p><strong>ZIP Code:</strong> {resultData.zip_code}</p>}
                    <p><strong>Total Rate (State):</strong> {(resultData.total_rate * 100).toFixed(4)}%</p>
                  </>
                ) : (
                  <p>This location has no state sales tax.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 3,
    position: 'relative',
  },
  sidebar: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
    boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.05)',
  },
  title: {
    color: '#212529',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#6c757d',
    marginTop: 0,
    marginBottom: '1rem',
  },
  searchForm: {
    display: 'flex',
    marginBottom: '2rem',
  },
  searchInputContainer: {
    position: 'relative',
    flex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    paddingRight: '2.5rem', // Make space for the clear button
    border: '1px solid #dee2e6',
    borderRadius: '8px 0 0 8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6c757d',
  },
  searchButton: {
    padding: '0.75rem 1rem',
    border: '1px solid #2a9d8f',
    backgroundColor: '#2a9d8f',
    color: 'white',
    borderRadius: '0 8px 8px 0',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  resultsContainer: {
    marginTop: '1.5rem',
  },
  card: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#343a40',
  },
  errorText: {
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    padding: '1rem',
    borderRadius: '8px',
  },
  infoText: {
    color: '#0c5460',
    backgroundColor: '#d1ecf1',
    padding: '1rem',
    borderRadius: '8px',
  },
  popupTitle: {
    margin: '0 0 5px 0',
  },
  popupText: {
    margin: 0,
  }
};

export default App;