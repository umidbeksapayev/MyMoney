import pool from './config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const createTestUser = async () => {
  try {
    console.log('🔄 Creating test user...');
    
    const testEmail = 'test@aurora.com';
    const testPassword = 'Test123456';
    const testName = 'Test User';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('ℹ️  Test user already exists!');
      console.log('');
      console.log('═══════════════════════════════════');
      console.log('📧 Email:', testEmail);
      console.log('🔑 Password:', testPassword);
      console.log('═══════════════════════════════════');
      return;
    }
    
    // Create user
    await pool.query(
      'INSERT INTO users (email, password, full_name) VALUES ($1, $2, $3)',
      [testEmail, hashedPassword, testName]
    );
    
    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('═══════════════════════════════════');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('═══════════════════════════════════');
    console.log('');
    console.log('👉 Use these credentials to login!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

createTestUser();

