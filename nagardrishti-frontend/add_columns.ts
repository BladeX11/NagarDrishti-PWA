import { config } from 'dotenv';
config();
import pkg from 'pg';
const { Pool } = pkg;

async function main() {
  console.log("Connecting to DB:", process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS file_hash text DEFAULT '' NOT NULL`);
    await pool.query(`ALTER TABLE issue_media ADD COLUMN IF NOT EXISTS perceptual_hash text`);
    console.log("Columns added successfully!");
  } catch (error) {
    console.error("Error adding columns:", error);
  } finally {
    await pool.end();
  }
}

main();
