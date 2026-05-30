import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function addRoleColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding role column to users table...');

    // Check if role column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠️  role column missing - adding now...');
      
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
      `);
      
      console.log('✅ role column added with default value "user"');
      
      // Update your admin account (replace with your email)
      console.log('📝 Set admin role for specific email...');
      console.log('⚠️  Please update the email in this script to set your admin account');
      
      // Uncomment and set your email here:
      // const adminEmail = 'your-email@example.com';
      // await client.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [adminEmail]);
      // console.log(`✅ Admin role set for ${adminEmail}`);
      
    } else {
      console.log('✅ role column already exists');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

addRoleColumn()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
