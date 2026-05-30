import pool from '../config/database.js';

async function migrateBudgetCurrency() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting budget currency migration...');
    
    // Check if currency column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name = 'currency';
    `);

    if (checkColumn.rows.length === 0) {
      console.log('➕ Adding currency column to budgets table...');
      
      await client.query(`
        ALTER TABLE budgets 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
      `);
      
      console.log('✅ Currency column added successfully');
    } else {
      console.log('ℹ️  Currency column already exists');
    }

    console.log('✨ Budget currency migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateBudgetCurrency();
