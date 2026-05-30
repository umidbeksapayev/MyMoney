import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function runMigration() {
  try {
    console.log('🔄 Running currency migration...');

    // Add currency column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'
    `);
    console.log('✅ Added currency column to users table');

    // Create exchange_rates table for caching
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id SERIAL PRIMARY KEY,
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(20, 6) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_currency, to_currency)
      )
    `);
    console.log('✅ Created exchange_rates table');

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
      ON exchange_rates(from_currency, to_currency)
    `);
    console.log('✅ Created index on exchange_rates');

    console.log('🎉 Currency migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

