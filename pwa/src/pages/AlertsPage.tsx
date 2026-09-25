import { Bell } from 'lucide-react';
import { AppBar } from '../components/AppBar';

export function AlertsPage() {
  return (
    <div className="page">
      <AppBar title="Alerts" />
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <div className="empty-geo">
          <Bell size={32} color="var(--color-primary)" aria-hidden="true" />
        </div>
        <p className="text-subheading">No alerts yet</p>
        <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
          Verification prompts and status updates will appear here.
        </p>
      </div>
    </div>
  );
}
