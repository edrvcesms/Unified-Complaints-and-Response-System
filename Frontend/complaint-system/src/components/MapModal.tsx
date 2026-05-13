import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { Map } from 'leaflet';
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
  originLatitude?: number | null;
  originLongitude?: number | null;
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
  originLatitude = null,
  originLongitude = null,
}) => {
  const [satellite, setSatellite] = useState(false);
  const [routeGeoJson, setRouteGeoJson] = useState<any | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  // route distance/duration/steps were removed because they're not used elsewhere
  const mapRef = useRef<Map | null>(null);

  React.useEffect(() => {
    // Auto-fetch route when modal opens and origin/destination are available
    if (!open) return;
    if (!originLatitude || !originLongitude) return;

    (async () => {
      try {
        const src = `${originLongitude},${originLatitude}`;
        const dst = `${longitude},${latitude}`;
        const url = `https://router.project-osrm.org/route/v1/driving/${src};${dst}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Routing failed');
        const data = await res.json();
        const route = data.routes?.[0];
        const geo = route?.geometry;
        const legs = route?.legs ?? [];
        const steps: any[] = [];
        for (const leg of legs) {
          if (leg?.steps) steps.push(...leg.steps);
        }
        if (geo) {
          setRouteGeoJson(geo);
          setShowRoute(true);
          const coords = geo.coordinates.map((c: any) => [c[1], c[0]]);
          const bounds = L.latLngBounds(coords as any);
          mapRef.current?.fitBounds(bounds.pad(0.1));
        }
      } catch (err) {
        console.error('Failed to fetch route', err);
      }
    })();
  }, [open, originLatitude, originLongitude, latitude, longitude]);

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
          // react-leaflet type for `whenReady` may vary by version — ignore strict typing here
          // @ts-ignore
          whenReady={(map: any) => (mapRef.current = map)}
        >
          <TileLayer
            url={tileUrl}
            attribution={attribution}
            maxZoom={18}
            maxNativeZoom={19}
          />

          {originLatitude && originLongitude && (
            <Marker position={[originLatitude, originLongitude]}>
              <Popup>Barangay Location</Popup>
            </Marker>
          )}

          <Marker position={[latitude, longitude]}>
            <Popup>{incidentTitle || 'Incident Location'}</Popup>
          </Marker>

          {routeGeoJson && showRoute && (
            <Polyline
              positions={routeGeoJson.coordinates.map((c: any) => [c[1], c[0]])}
              pathOptions={{ color: '#dc2626', weight: 5 }} // Tailwind's red-600
            />
          )}
        </MapContainer>

        

        <div style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 1001 }}>
          <button
            style={toggleButtonStyle}
            onClick={() => setSatellite(!satellite)}
          >
            🗺️ {satellite ? 'Map' : 'Satellite'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MapModal;