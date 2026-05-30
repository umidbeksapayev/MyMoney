import pool from '../config/database.js';

const migrateAmountLimit = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating amount column size to support larger numbers...');
    
    await client.query('BEGIN');

    // Update transactions table
    await client.query(`
      ALTER TABLE transactions 
      ALTER COLUMN amount TYPE DECIMAL(15, 2);
    `);
    console.log('✅ Updated transactions.amount column');

    // Update budgets table
    await client.query(`
      ALTER TABLE budgets 
      ALTER COLUMN amount TYPE DECIMAL(15, 2);
    `);
    console.log('✅ Updated budgets.amount column');

    await client.query('COMMIT');
    console.log('🎉 Amount limit migration completed successfully!');
    console.log('📊 New maximum amount: 999,999,999,999.99');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrateAmountLimit().catch(console.error);

