import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function runMigration() {
  try {
    console.log('🔄 Running password reset migration...');

    // Create password_resets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created password_resets table');

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_resets_token 
      ON password_resets(token)
    `);
    console.log('✅ Created index on password_resets');

    // Create index for expiry cleanup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_resets_expires 
      ON password_resets(expires_at)
    `);
    console.log('✅ Created index on expires_at');

    console.log('🎉 Password reset migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

