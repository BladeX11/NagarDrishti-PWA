import 'dotenv/config';
import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function syncWardColumns() {
  console.log('Syncing ward demographic metadata columns...');
  await db.execute(sql`
    ALTER TABLE wards ADD COLUMN IF NOT EXISTS ward_type text;
    ALTER TABLE wards ADD COLUMN IF NOT EXISTS density_tier text;
    ALTER TABLE wards ADD COLUMN IF NOT EXISTS tax_band text;

    UPDATE wards SET ward_type = 'planned', density_tier = 'medium', tax_band = 'B' WHERE id = 'ward-11' AND ward_type IS NULL;
    UPDATE wards SET ward_type = 'mixed', density_tier = 'high', tax_band = 'A' WHERE id = 'ward-12' AND ward_type IS NULL;
    UPDATE wards SET ward_type = 'unplanned', density_tier = 'high', tax_band = 'C' WHERE id = 'ward-14' AND ward_type IS NULL;
    UPDATE wards SET ward_type = 'peri-urban', density_tier = 'low', tax_band = 'D' WHERE id = 'ward-15' AND ward_type IS NULL;
  `);

  const rows = await db.execute(sql`SELECT id, name, ward_type, density_tier, tax_band FROM wards;`);
  console.log('Current wards table in PostgreSQL:', rows.rows);
  console.log('Ward demographic columns successfully synced.');
  process.exit(0);
}

syncWardColumns().catch((err) => {
  console.error('Error syncing ward columns:', err);
  process.exit(1);
});
