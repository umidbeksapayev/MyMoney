import pool from '../config/database.js';

async function migrateInviteCodes() {
  const client = await pool.connect();
  
  try {
    console.log('Starting invite codes migration...');

    await client.query('BEGIN');

    // Create family_invite_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_invite_codes (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        code VARCHAR(8) NOT NULL UNIQUE,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        max_uses INTEGER,
        uses_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_invite_codes_code 
      ON family_invite_codes(code) 
      WHERE is_active = true
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_family_invite_codes_family 
      ON family_invite_codes(family_id) 
      WHERE is_active = true
    `);

    await client.query('COMMIT');
    
    console.log('✅ Invite codes migration completed successfully');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateInviteCodes();
