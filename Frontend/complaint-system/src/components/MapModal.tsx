import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
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
  width: 'min(92vw, 1100px)',
  height: 'min(84vh, 760px)',
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
  width: 40,
  height: 40,
  fontSize: 24,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const toggleButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 14,
  right: 14,
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

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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