import { MapPin } from 'lucide-react';
import { AppBar } from '../components/AppBar';

export function MapPage() {
  return (
    <div className="page">
      <AppBar title="Map View" />
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="empty-geo">
          <MapPin size={32} color="var(--color-primary)" aria-hidden="true" />
        </div>
        <p className="text-subheading">Full Map View</p>
        <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
          Leaflet map with PostGIS-backed issue layers (Stage 4 — Public Transparency).
        </p>
      </div>
    </div>
  );
}
