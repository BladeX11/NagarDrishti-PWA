import { config } from 'dotenv';
config();
import pkg from 'pg';
const { Pool } = pkg;

async function main() {
  console.log("Connecting to DB:", process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // 1. Ensure all columns on issue_media exist
    await pool.query(`
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS file_hash text DEFAULT '' NOT NULL;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS perceptual_hash text;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS public_path text;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS exif_lat double precision;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS exif_lng double precision;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS captured_at timestamp;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS file_size integer;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS mime_type text;
      ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS privacy_reviewed boolean DEFAULT false;
    `);
    console.log("issue_media columns synchronized!");

    // 2. Ensure adversarial_flags table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS adversarial_flags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        issue_id uuid REFERENCES issues(id),
        rule text NOT NULL,
        severity text NOT NULL,
        details jsonb NOT NULL,
        resolved_at timestamp,
        resolved_by uuid REFERENCES users(id),
        resolution text,
        model_version text DEFAULT 'adversarial-rules-v1.0' NOT NULL,
        created_at timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_adversarial_flags_issue_id ON adversarial_flags (issue_id);
      CREATE INDEX IF NOT EXISTS idx_adversarial_flags_rule ON adversarial_flags (rule);
    `);
    console.log("adversarial_flags table synchronized!");

    // 3. Print current columns on issue_media
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'issue_media'
      ORDER BY ordinal_position;
    `);
    console.log("Current issue_media columns:", res.rows.map(r => r.column_name).join(', '));
  } catch (error) {
    console.error("Error synchronizing schema:", error);
  } finally {
    await pool.end();
  }
}

main();
