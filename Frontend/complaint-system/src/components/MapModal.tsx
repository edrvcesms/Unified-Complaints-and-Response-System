import React from 'react';
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
  width: 48,
  height: 48,
  fontSize: 28,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
};

const MapModal: React.FC<MapModalProps> = ({ open, onClose, latitude, longitude, incidentTitle }) => {
  if (!open) return null;
  return (
    <div style={modalStyle}>
      <div style={mapContainerStyle}>
        <button style={closeButtonStyle} onClick={onClose} aria-label="Close Map">×</button>
        <MapContainer center={[latitude, longitude]} zoom={16} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]}>
            <Popup>{incidentTitle || 'Incident Location'}</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default MapModal;
