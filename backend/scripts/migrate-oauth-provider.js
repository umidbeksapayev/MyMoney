import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function addOAuthProvider() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding oauth_provider column to users table...');

    // Check if oauth_provider column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'oauth_provider';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠️  oauth_provider column missing - adding now...');
      
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) DEFAULT 'local';
      `);
      
      console.log('✅ oauth_provider column added with default value "local"');
    } else {
      console.log('✅ oauth_provider column already exists');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

addOAuthProvider()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
