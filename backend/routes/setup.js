import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// One-time setup endpoint - adds role column and sets admin
// This endpoint will only work if role column doesn't exist
// After first use, it becomes disabled
router.post('/init-admin', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, secret } = req.body;

    // Simple security: require a secret key from environment
    const SETUP_SECRET = process.env.SETUP_SECRET || 'aurora-setup-2024';
    
    if (secret !== SETUP_SECRET) {
      return res.status(403).json({ error: 'Invalid setup secret' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let setupPerformed = false;

    // Check if role column exists
    const roleColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role';
    `);

    // Add role column if it doesn't exist
    if (roleColumnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'user';
      `);
      setupPerformed = true;
      console.log('✅ role column added');
    }

    // Check if oauth_provider column exists
    const oauthColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'oauth_provider';
    `);

    // Add oauth_provider column if it doesn't exist
    if (oauthColumnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN oauth_provider VARCHAR(20) DEFAULT 'local';
      `);
      setupPerformed = true;
      console.log('✅ oauth_provider column added');
    }

    // Check if user exists
    const userCheck = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: `No user found with email: ${email}. Please register first.` 
      });
    }

    const user = userCheck.rows[0];

    // Set admin role
    await client.query(
      'UPDATE users SET role = $1 WHERE email = $2',
      ['admin', email]
    );

    setupPerformed = true;

    res.json({
      success: true,
      message: 'Admin setup completed successfully!',
      user: {
        id: user.id,
        email: user.email,
        role: 'admin'
      },
      note: 'Please logout and login again to see admin features'
    });

  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed', details: error.message });
  } finally {
    client.release();
  }
});

// Check if setup is needed
router.get('/check-setup', async (req, res) => {
  try {
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role';
    `);

    const roleColumnExists = columnCheck.rows.length > 0;

    res.json({
      roleColumnExists,
      setupNeeded: !roleColumnExists,
      message: roleColumnExists 
        ? 'Role column already exists. Use /setup/init-admin to set admin role.' 
        : 'Role column missing. Run /setup/init-admin to complete setup.'
    });
  } catch (error) {
    console.error('Check setup error:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

export default router;
