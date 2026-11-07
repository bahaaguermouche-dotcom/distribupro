import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

// Fix default marker icon paths in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LocationPickerMap({ lat, lng, onChange }: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const initialLat = lat || 36.7538;
      const initialLng = lng || 3.0588;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChange(position.lat, position.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    } else {
      if (lat && lng) {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom());
        markerRef.current?.setLatLng([lat, lng]);
      }
    }

    return () => {
      // Map cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '240px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          zIndex: 1,
        }}
      />
      <div style={{
        marginTop: 6, fontSize: 11, color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span>💡 Cliquez sur la carte ou faites glisser le marqueur bleu sur votre magasin/entrepôt.</span>
        {lat && lng && (
          <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>
            GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        )}
      </div>
    </div>
  );
}
