import 'dotenv/config';
import { db } from './index.js';
import { sql } from 'drizzle-orm';

export async function syncCascadeAlertsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cascade_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ward_id TEXT REFERENCES wards(id),
      center_lat DOUBLE PRECISION NOT NULL,
      center_lng DOUBLE PRECISION NOT NULL,
      radius_meters DOUBLE PRECISION NOT NULL,
      issue_ids JSONB NOT NULL,
      categories JSONB NOT NULL,
      suggested_root_cause TEXT NOT NULL,
      confidence TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cascade_alerts_ward_id ON cascade_alerts(ward_id);
    CREATE INDEX IF NOT EXISTS idx_cascade_alerts_status ON cascade_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_cascade_alerts_created_at ON cascade_alerts(created_at);
  `);
}

// Allow standalone execution
if (process.argv[1]?.endsWith('sync_cascade_alerts.ts') || process.argv[1]?.endsWith('sync_cascade_alerts.js')) {
  syncCascadeAlertsTable()
    .then(() => {
      console.log('cascade_alerts table successfully synced in database.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to sync cascade_alerts table:', err);
      process.exit(1);
    });
}
