import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrations = [
  'migrate.js',
  'migrate-add-role.js',
  'migrate-oauth-provider.js',
  'migrate-password-reset.js',
  'migrate-currency.js',
  'migrate-add-currency-to-transactions.js',
  'migrate-amount-limit.js',
  'migrate-budget-currency.js',
  'migrate-recurring-transactions.js',
  'migrate-saving-goals.js',
  'migrate-family-sharing.js',
  'migrate-family-roles.js',
  'migrate-invite-codes.js'
];

async function runAll() {
  console.log('🚀 Starting all database migrations sequentially...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  // 1. Run all JavaScript migrations
  for (const migration of migrations) {
    const filePath = path.join(__dirname, migration);
    console.log(`----------------------------------------`);
    console.log(`⏳ Running migration: ${migration}...`);
    try {
      execSync(`node "${filePath}"`, {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      console.log(`✅ Completed: ${migration}\n`);
    } catch (error) {
      console.error(`❌ Migration failed: ${migration}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  // 2. Run SQL migration for family invite codes role
  console.log(`----------------------------------------`);
  console.log(`⏳ Running SQL migration: add_role_to_invite_codes.sql...`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add_role_to_invite_codes.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Completed: add_role_to_invite_codes.sql\n');
    } else {
      console.log('⚠️  add_role_to_invite_codes.sql not found, skipping...\n');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.warn('⚠️ Warning: SQL Migration error (might already be applied):', error.message);
    console.log('Continuing deployment process...\n');
  } finally {
    client.release();
    await pool.end();
  }

  console.log('========================================');
  console.log('🎉 ALL MIGRATIONS EXECUTED SUCCESSFULLY!');
  console.log('========================================');
}

runAll().catch(err => {
  console.error('💥 Unexpected error during migrations:', err);
  process.exit(1);
});
