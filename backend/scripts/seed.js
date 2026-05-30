import pool from '../config/database.js';
import bcrypt from 'bcrypt';

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password, full_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['demo@auroraledger.com', hashedPassword, 'Demo User']
    );
    const userId = userResult.rows[0].id;

    console.log('✅ Demo user created: demo@auroraledger.com / demo123');

    // Create categories
    const incomeCategories = [
      { name: 'Salary', icon: 'briefcase', color: '#10B981' },
      { name: 'Freelance', icon: 'code', color: '#3B82F6' },
      { name: 'Investment', icon: 'trending-up', color: '#8B5CF6' },
      { name: 'Other Income', icon: 'dollar-sign', color: '#06B6D4' }
    ];

    const expenseCategories = [
      { name: 'Food & Dining', icon: 'utensils', color: '#EF4444' },
      { name: 'Transportation', icon: 'car', color: '#F59E0B' },
      { name: 'Shopping', icon: 'shopping-bag', color: '#EC4899' },
      { name: 'Entertainment', icon: 'film', color: '#8B5CF6' },
      { name: 'Bills & Utilities', icon: 'file-text', color: '#6366F1' },
      { name: 'Healthcare', icon: 'heart', color: '#14B8A6' },
      { name: 'Education', icon: 'book', color: '#0EA5E9' },
      { name: 'Other Expenses', icon: 'more-horizontal', color: '#64748B' }
    ];

    const categoryIds = { income: [], expense: [] };

    for (const cat of incomeCategories) {
      const result = await client.query(
        `INSERT INTO categories (user_id, name, type, color, icon) 
         VALUES ($1, $2, 'income', $3, $4) RETURNING id`,
        [userId, cat.name, cat.color, cat.icon]
      );
      categoryIds.income.push(result.rows[0].id);
    }

    for (const cat of expenseCategories) {
      const result = await client.query(
        `INSERT INTO categories (user_id, name, type, color, icon) 
         VALUES ($1, $2, 'expense', $3, $4) RETURNING id`,
        [userId, cat.name, cat.color, cat.icon]
      );
      categoryIds.expense.push(result.rows[0].id);
    }

    console.log('✅ Categories created');

    // Create sample transactions for last 3 months
    const today = new Date();
    const transactions = [];

    // Income transactions
    for (let i = 0; i < 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 15);
      transactions.push({
        user_id: userId,
        category_id: categoryIds.income[0], // Salary
        type: 'income',
        amount: 5000,
        description: 'Monthly salary',
        date: date.toISOString().split('T')[0]
      });
    }

    // Expense transactions
    const expenseSamples = [
      { categoryIdx: 0, amount: 450, desc: 'Grocery shopping' },
      { categoryIdx: 0, amount: 85, desc: 'Restaurant dinner' },
      { categoryIdx: 1, amount: 120, desc: 'Gas station' },
      { categoryIdx: 1, amount: 45, desc: 'Uber ride' },
      { categoryIdx: 2, amount: 200, desc: 'New clothes' },
      { categoryIdx: 3, amount: 50, desc: 'Movie tickets' },
      { categoryIdx: 4, amount: 350, desc: 'Electricity bill' },
      { categoryIdx: 4, amount: 80, desc: 'Internet bill' },
      { categoryIdx: 5, amount: 150, desc: 'Pharmacy' },
      { categoryIdx: 6, amount: 300, desc: 'Online course' }
    ];

    for (let month = 0; month < 3; month++) {
      for (const sample of expenseSamples) {
        const day = Math.floor(Math.random() * 28) + 1;
        const date = new Date(today.getFullYear(), today.getMonth() - month, day);
        transactions.push({
          user_id: userId,
          category_id: categoryIds.expense[sample.categoryIdx],
          type: 'expense',
          amount: sample.amount,
          description: sample.desc,
          date: date.toISOString().split('T')[0]
        });
      }
    }

    for (const trans of transactions) {
      await client.query(
        `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [trans.user_id, trans.category_id, trans.type, trans.amount, trans.description, trans.date]
      );
    }

    console.log(`✅ ${transactions.length} sample transactions created`);

    // Create budgets for current month
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const budgets = [
      { categoryIdx: 0, amount: 600 },  // Food & Dining
      { categoryIdx: 1, amount: 200 },  // Transportation
      { categoryIdx: 2, amount: 300 },  // Shopping
      { categoryIdx: 4, amount: 500 },  // Bills & Utilities
    ];

    for (const budget of budgets) {
      await client.query(
        `INSERT INTO budgets (user_id, category_id, amount, month, year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, category_id, month, year) DO NOTHING`,
        [userId, categoryIds.expense[budget.categoryIdx], budget.amount, currentMonth, currentYear]
      );
    }

    console.log('✅ Sample budgets created');

    await client.query('COMMIT');
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: demo@auroraledger.com');
    console.log('   Password: demo123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedData().catch(console.error);

