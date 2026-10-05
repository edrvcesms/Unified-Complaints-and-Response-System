import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { Map as LeafletMap, LatLngExpression } from "leaflet";
import L from "leaflet";
import { ArrowLeft, LocateFixed, Navigation, Satellite, StopCircle } from "lucide-react";
import { useIncidentDetails } from "../../../hooks/useIncidents";
import LoadingIndicator from "./../LoadingIndicator";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

type Coordinates = { latitude: number; longitude: number };
type TrackingState = "requesting" | "tracking" | "denied" | "unavailable" | "error" | "stopped";

const ROUTE_REFRESH_DISTANCE_METERS = 100;

L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const responderIcon = L.divIcon({
  className: "responder-location-marker",
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#2563eb;border:4px solid white;box-shadow:0 1px 6px rgba(0,0,0,.45)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const toRadians = (value: number) => (value * Math.PI) / 180;
const distanceInMeters = (a: Coordinates, b: Coordinates) => {
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const formatDistance = (meters: number) => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`);

function MapViewport({ responder, incident, mapRef }: { responder: Coordinates; incident: Coordinates; mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    mapRef.current = map;
    if (!didFit.current) {
      const bounds = L.latLngBounds([
        [responder.latitude, responder.longitude],
        [incident.latitude, incident.longitude],
      ]);
      map.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
      didFit.current = true;
    }
    return () => {
      mapRef.current = null;
    };
  }, [incident, map, mapRef, responder]);

  return null;
}

export const IncidentTrackingPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));
  const [responder, setResponder] = useState<Coordinates | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState>("requesting");
  const [message, setMessage] = useState("Requesting access to your device location…");
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [trackingAttempt, setTrackingAttempt] = useState(0);
  const watchId = useRef<number | null>(null);
  const lastRoutedLocation = useRef<Coordinates | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const destination = useMemo(
    () => (incident ? { latitude: incident.latitude, longitude: incident.longitude } : null),
    [incident?.latitude, incident?.longitude],
  );

  const fetchRoute = useCallback(async (origin: Coordinates, target: Coordinates) => {
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${target.longitude},${target.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Route request failed");
      const data = await response.json();
      const coordinates = data.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates)) throw new Error("No route was returned");
      setRoute(coordinates.map(([longitude, latitude]: [number, number]) => [latitude, longitude]));
      lastRoutedLocation.current = origin;
    } catch (routeError) {
      console.error("Unable to update incident route:", routeError);
      setMessage("Live location is active, but the route could not be updated.");
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setResponder(next);
    setTrackingState("tracking");
    setMessage("Live location is active");
    if (destination && (!lastRoutedLocation.current || distanceInMeters(lastRoutedLocation.current, next) >= ROUTE_REFRESH_DISTANCE_METERS)) {
      void fetchRoute(next, destination);
    }
  }, [destination, fetchRoute]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTrackingState("stopped");
    setMessage("Live tracking is paused.");
  }, []);

  useEffect(() => {
    if (!destination) return;
    if (!navigator.geolocation) {
      setTrackingState("unavailable");
      setMessage("This browser does not support location access. Live tracking requires device location.");
      return;
    }

    const handleError = (positionError: GeolocationPositionError) => {
      if (positionError.code === positionError.PERMISSION_DENIED) {
        setTrackingState("denied");
        setMessage("Location access is required for live tracking. Allow location access in your browser settings and try again.");
      } else if (positionError.code === positionError.POSITION_UNAVAILABLE) {
        setTrackingState("unavailable");
        setMessage("Location services are unavailable. Enable your device location services and try again.");
      } else {
        setTrackingState("error");
        setMessage("We could not obtain your current location. Check location services and try again.");
      }
    };

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
    watchId.current = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [destination, handlePosition, trackingAttempt]);

  if (isLoading) return <LoadingIndicator />;
  if (error || !incident || !destination) return <div className="flex min-h-screen items-center justify-center p-6 text-center text-red-700">Unable to load this incident.</div>;

  const distance = responder ? distanceInMeters(responder, destination) : null;
  const initialCenter: LatLngExpression = responder ? [responder.latitude, responder.longitude] : [destination.latitude, destination.longitude];
  const canRetry = trackingState !== "tracking" && trackingState !== "requesting";

  const retryTracking = () => {
    setTrackingState("requesting");
    setMessage("Requesting access to your device location…");
    setTrackingAttempt((attempt) => attempt + 1);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-100">
      <MapContainer center={initialCenter} zoom={15} minZoom={2} maxZoom={19} className="h-full w-full">
        <TileLayer
          url={satellite ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
          attribution={satellite ? "Tiles © Esri" : "&copy; OpenStreetMap contributors"}
        />
        {responder && <MapViewport responder={responder} incident={destination} mapRef={mapRef} />}
        {responder && <Marker position={[responder.latitude, responder.longitude]} icon={responderIcon} />}
        <Marker position={[destination.latitude, destination.longitude]} />
        {route.length > 0 && <Polyline positions={route} pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.85 }} />}
      </MapContainer>

      <div className="absolute left-4 top-4 z-[1000] flex max-w-[min(92vw,420px)] items-start gap-3 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{incident.title}</p>
          <p className={`mt-1 text-xs ${trackingState === "tracking" ? "text-green-700" : "text-amber-700"}`}>{message}</p>
          {distance !== null && <p className="mt-1 text-sm font-semibold text-slate-900">Distance: {formatDistance(distance)}</p>}
        </div>
      </div>

      <div className="absolute bottom-5 right-4 z-[1000] flex flex-col gap-2">
        <button type="button" onClick={() => setSatellite((value) => !value)} className="rounded-full bg-white p-3 shadow-lg" aria-label="Toggle satellite map">
          <Satellite size={20} />
        </button>
        <button type="button" onClick={() => responder && mapRef.current?.setView([responder.latitude, responder.longitude], 17)} disabled={!responder} className="rounded-full bg-white p-3 shadow-lg disabled:opacity-50" aria-label="Recenter on responder">
          <LocateFixed size={20} />
        </button>
        {trackingState === "tracking" ? (
          <button type="button" onClick={stopTracking} className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <StopCircle size={18} /> Stop tracking
          </button>
        ) : canRetry ? (
          <button type="button" onClick={retryTracking} className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <Navigation size={18} /> Try again
          </button>
        ) : null}
      </div>
      {routeLoading && <div className="absolute bottom-5 left-4 z-[1000] rounded-full bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">Updating route…</div>}
    </div>
  );
};

export default IncidentTrackingPage;
