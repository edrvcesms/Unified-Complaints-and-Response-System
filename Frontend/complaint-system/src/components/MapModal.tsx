import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapModalProps {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  incidentTitle?: string;
}

const modalStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.8)',
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const mapContainerStyle: React.CSSProperties = {
  width: '80vw',
  height: '80vh',
  background: '#fff',
  borderRadius: 12,
  position: 'relative',
  boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
  overflow: 'hidden',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 1001,
  background: 'rgba(255,255,255,0.95)',
  border: '2px solid #333',
  color: '#222',
  borderRadius: '50%',
  width: 44,
  height: 44,
  fontSize: 24,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const toggleButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  right: 16,
  zIndex: 1001,
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid #ddd',
  padding: '8px 12px',
  borderRadius: 20,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const MapModal: React.FC<MapModalProps> = ({
  open,
  onClose,
  latitude,
  longitude,
  incidentTitle,
}) => {
  const [satellite, setSatellite] = useState(false);

  if (!open) return null;

  const tileUrl = satellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = satellite
    ? 'Tiles © Esri'
    : '&copy; OpenStreetMap contributors';

  return (
    <div style={modalStyle}>
      <div style={mapContainerStyle}>

        {/* Close button (Google Maps style top-right) */}
        <button style={closeButtonStyle} onClick={onClose}>
          ×
        </button>

        {/* Map */}
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          minZoom={2}
          maxZoom={18}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url={tileUrl}
            attribution={attribution}
            maxZoom={18}
            maxNativeZoom={19}
          />

          <Marker position={[latitude, longitude]}>
            <Popup>{incidentTitle || 'Incident Location'}</Popup>
          </Marker>
        </MapContainer>

        {/* Google Maps style bottom-right toggle */}
        <button
          style={toggleButtonStyle}
          onClick={() => setSatellite(!satellite)}
        >
          🗺️ {satellite ? 'Map' : 'Satellite'}
        </button>

      </div>
    </div>
  );
};

export default MapModal;