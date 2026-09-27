import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { Issue } from '../../types';
import { statusDot } from './StatusBadge';

const getCoords = (issue: any): [number, number] | null => {
  if (Array.isArray(issue.position) && issue.position.length >= 2 && typeof issue.position[0] === 'number') {
    return [issue.position[0], issue.position[1]];
  }
  if (typeof issue.latitude === 'number' && typeof issue.longitude === 'number') {
    return [issue.latitude, issue.longitude];
  }
  return null;
};

const coarsen = (coords?: [number, number] | null): [number, number] | null => {
  if (!coords || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' || isNaN(coords[0]) || isNaN(coords[1])) {
    return null;
  }
  return [Math.round(coords[0] * 200) / 200, Math.round(coords[1] * 200) / 200];
};

function MapClickHandler({ onPinChange }: { onPinChange: (position: [number, number]) => void }) {
  useMapEvents({ click: event => onPinChange(coarsen([event.latlng.lat, event.latlng.lng]) || [18.5204, 73.8567]) });
  return null;
}

export function MapView({ issues, selectedId, onSelectIssue, height = '520px', publicView = false, pinPosition, onPinChange }: { issues: Issue[]; selectedId?: string; onSelectIssue?: (issue: Issue) => void; height?: string; publicView?: boolean; pinPosition?: [number, number]; onPinChange?: (position: [number, number]) => void }) {
  const pin = coarsen(pinPosition);
  return (
    <div className="map-frame relative" style={{ height }}>
      <MapContainer center={[18.5204, 73.8567]} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {onPinChange && <MapClickHandler onPinChange={onPinChange} />}
        {issues.map(issue => {
          const rawPos = getCoords(issue);
          const pos = coarsen(rawPos);
          if (!pos) return null;
          const statusColor = (statusDot as Record<string, string>)[issue.status] || '#B8892D';
          const wardLabel = (issue as any).ward || (issue as any).wardId || 'Pune';
          const ageLabel = issue.age || 'Recent';

          return (
            <CircleMarker
              key={issue.id}
              center={pos}
              radius={issue.id === selectedId ? 12 : 8}
              pathOptions={{
                color: issue.id === selectedId ? '#FDFBF7' : '#2A3320',
                weight: issue.id === selectedId ? 3 : 2,
                fillColor: statusColor,
                fillOpacity: 0.94,
              }}
              eventHandlers={{ click: () => onSelectIssue?.(issue) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>{issue.category}</Tooltip>
              <Popup>
                <div className="min-w-48 font-sans text-[#2A3320]">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-[#4F5B2A]">{wardLabel} · {publicView ? 'Approximate location' : ageLabel}</p>
                  <p className="text-sm font-black">{issue.title}</p>
                  <p className="mt-1 text-xs">{issue.category} · {issue.status}</p>
                  <Link className="mt-2 inline-block text-xs font-black uppercase text-[#4F5B2A] underline" to={publicView ? `/transparency/issue/${issue.id}` : `/citizen/issue/${issue.id}`}>View detail →</Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {pin && <CircleMarker center={pin} radius={12} pathOptions={{ color: '#2A3320', weight: 3, fillColor: '#B8892D', fillOpacity: 1 }}><Tooltip permanent direction="top" offset={[0, -8]}>Approximate report pin</Tooltip></CircleMarker>}
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-[500] border-4 border-[#2A3320] bg-[#FDFBF7] p-3 shadow-[3px_3px_0px_0px_#2A3320]">
        <p className="mb-2 text-[9px] font-black uppercase tracking-widest">Issue status</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold">
          {[['Open', '#B8892D'], ['In progress', '#4F5B2A'], ['Resolved', '#2A3320']].map(([label, color]) => <span key={label} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full border border-[#2A3320]" style={{ backgroundColor: color }} />{label}</span>)}
        </div>
      </div>
      {publicView && <div className="absolute right-3 top-3 z-[500] border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase tracking-wider">⌖ Public pins are coarsened</div>}
    </div>
  );
}
