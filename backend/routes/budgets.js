import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { convertCurrency } from '../utils/currency.js';

const router = express.Router();
router.use(authMiddleware);

// Get budgets for a specific month/year
router.get('/', async (req, res) => {
  try {
    const { month, year, currency: displayCurrency } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Get user's preferred currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';

    const result = await pool.query(
      `SELECT 
         b.id,
         b.category_id,
         b.amount,
         b.currency,
         b.month,
         b.year,
         b.created_at,
         b.updated_at,
         c.name as category_name, 
         c.color as category_color, 
         c.icon as category_icon
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       ORDER BY c.name`,
      [req.user.id, month, year]
    );

    // Get all transactions for this period (we'll convert everything to target currency)
    const transactionsResult = await pool.query(
      `SELECT 
         category_id,
         amount,
         currency
       FROM transactions
       WHERE user_id = $1 
       AND type = 'expense'
       AND EXTRACT(MONTH FROM transaction_date) = $2
       AND EXTRACT(YEAR FROM transaction_date) = $3`,
      [req.user.id, month, year]
    );

    // Add spent data with proper conversion for comparison
    const budgetsWithSpent = await Promise.all(
      result.rows.map(async (budget) => {
        const budgetCurrency = budget.currency;
        
        // Get spent in budget's currency for accurate comparison
        let totalSpentInBudgetCurrency = 0;
        
        // Calculate spent in budget's original currency
        for (const t of transactionsResult.rows) {
          if (t.category_id === budget.category_id) {
            const convertedAmount = await convertCurrency(
              parseFloat(t.amount),
              t.currency,
              budgetCurrency // Convert to budget's original currency
            );
            totalSpentInBudgetCurrency += convertedAmount;
          }
        }
        
        // Convert both budget amount and spent to display currency
        const budgetAmountInDisplayCurrency = await convertCurrency(
          parseFloat(budget.amount),
          budgetCurrency,
          targetCurrency
        );
        
        const spentInDisplayCurrency = await convertCurrency(
          totalSpentInBudgetCurrency,
          budgetCurrency,
          targetCurrency
        );

        return {
          id: budget.id,
          category_id: budget.category_id,
          amount: budgetAmountInDisplayCurrency, // Display in selected currency
          original_amount: parseFloat(budget.amount), // Keep original for reference
          original_currency: budgetCurrency, // Original currency
          currency: targetCurrency, // Display currency
          month: budget.month,
          year: budget.year,
          category_name: budget.category_name,
          category_color: budget.category_color,
          category_icon: budget.category_icon,
          spent: spentInDisplayCurrency, // Spent in display currency
          created_at: budget.created_at,
          updated_at: budget.updated_at
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update budget
router.post('/',
  [
    body('category_id').isInt(),
    body('amount').isFloat({ min: 0.01, max: 999999999999.99 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2000 }),
    body('input_currency').optional().isString().isLength({ min: 3, max: 3 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { category_id, amount, month, year, input_currency } = req.body;

      // Get user's preferred currency as default
      const userResult = await pool.query(
        'SELECT currency FROM users WHERE id = $1',
        [req.user.id]
      );
      const userCurrency = userResult.rows[0]?.currency || 'USD';

      // Save budget in the currency user specified (or default to user's currency)
      const budgetCurrency = input_currency || userCurrency;

      // Verify category belongs to user and is expense type
      const catResult = await pool.query(
        'SELECT id, type FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, req.user.id]
      );
      
      if (catResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      if (catResult.rows[0].type !== 'expense') {
        return res.status(400).json({ error: 'Budgets can only be set for expense categories' });
      }

      // Save budget with the currency user specified
      const result = await pool.query(
        `INSERT INTO budgets (user_id, category_id, amount, month, year, currency)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, category_id, month, year)
         DO UPDATE SET amount = $3, currency = $6, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [req.user.id, category_id, amount, month, year, budgetCurrency]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create/Update budget error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update budget (PUT method)
router.put('/:id',
  [
    body('category_id').isInt(),
    body('amount').isFloat({ min: 0.01, max: 999999999999.99 }),
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2000 }),
    body('input_currency').optional().isString().isLength({ min: 3, max: 3 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { category_id, amount, month, year, input_currency } = req.body;

      // Get user's preferred currency as default
      const userResult = await pool.query(
        'SELECT currency FROM users WHERE id = $1',
        [req.user.id]
      );
      const userCurrency = userResult.rows[0]?.currency || 'USD';

      // Save budget in the currency user specified (or default to user's currency)
      const budgetCurrency = input_currency || userCurrency;

      // Verify category belongs to user and is expense type
      const catResult = await pool.query(
        'SELECT id, type FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, req.user.id]
      );
      
      if (catResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      if (catResult.rows[0].type !== 'expense') {
        return res.status(400).json({ error: 'Budgets can only be set for expense categories' });
      }

      // Update budget
      const result = await pool.query(
        `UPDATE budgets 
         SET category_id = $2, amount = $3, month = $4, year = $5, currency = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $7
         RETURNING *`,
        [id, category_id, amount, month, year, budgetCurrency, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update budget error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete budget
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== SMART BUDGETS ====================

// Get budget suggestions based on last 3 months spending
router.get('/suggestions', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Get user's preferred currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );
    const userCurrency = userResult.rows[0]?.currency || 'USD';

    // Calculate 3 months before the target month
    const targetDate = new Date(year, month - 1, 1);
    const threeMonthsAgo = new Date(targetDate);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get spending for last 3 months grouped by category
    const spendingResult = await pool.query(
      `SELECT 
         t.category_id,
         c.name as category_name,
         c.color as category_color,
         c.icon as category_icon,
         AVG(monthly_totals.total) as avg_spent,
         MAX(monthly_totals.total) as max_spent,
         MIN(monthly_totals.total) as min_spent,
         COUNT(DISTINCT monthly_totals.month_year) as months_with_spending
       FROM (
         SELECT 
           category_id,
           TO_CHAR(transaction_date, 'YYYY-MM') as month_year,
           SUM(
             CASE 
               WHEN currency = $2 THEN amount
               ELSE 0
             END
           ) as total
         FROM transactions
         WHERE user_id = $1
         AND type = 'expense'
         AND transaction_date >= $3
         AND transaction_date < $4
         GROUP BY category_id, month_year
       ) monthly_totals
       JOIN transactions t ON t.category_id = monthly_totals.category_id
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
       GROUP BY t.category_id, c.name, c.color, c.icon
       HAVING COUNT(DISTINCT monthly_totals.month_year) >= 1
       ORDER BY AVG(monthly_totals.total) DESC`,
      [req.user.id, userCurrency, threeMonthsAgo, targetDate]
    );

    // Calculate suggested budgets with 10% buffer
    const suggestions = spendingResult.rows.map(row => ({
      category_id: row.category_id,
      category_name: row.category_name,
      category_color: row.category_color,
      category_icon: row.category_icon,
      avg_spent: parseFloat(row.avg_spent || 0),
      max_spent: parseFloat(row.max_spent || 0),
      min_spent: parseFloat(row.min_spent || 0),
      months_with_data: parseInt(row.months_with_spending),
      suggested_amount: Math.ceil(parseFloat(row.avg_spent || 0) * 1.1), // Add 10% buffer
      currency: userCurrency,
      confidence: row.months_with_spending >= 3 ? 'high' : 
                  row.months_with_spending >= 2 ? 'medium' : 'low'
    }));

    res.json({ 
      suggestions,
      analysis_period: {
        from: threeMonthsAgo.toISOString().split('T')[0],
        to: targetDate.toISOString().split('T')[0],
        months_analyzed: 3
      },
      currency: userCurrency
    });
  } catch (error) {
    console.error('Budget suggestions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get budget templates (50/30/20 rule, etc.)
router.get('/templates', async (req, res) => {
  try {
    const { monthly_income } = req.query;
    
    if (!monthly_income || isNaN(monthly_income)) {
      return res.status(400).json({ error: 'Valid monthly_income is required' });
    }

    // Get user's preferred currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );
    const userCurrency = userResult.rows[0]?.currency || 'USD';

    const income = parseFloat(monthly_income);

    const templates = [
      {
        name: '50/30/20 Rule',
        description: '50% Needs, 30% Wants, 20% Savings',
        allocations: {
          needs: { percentage: 50, amount: income * 0.5 },
          wants: { percentage: 30, amount: income * 0.3 },
          savings: { percentage: 20, amount: income * 0.2 }
        },
        suggested_categories: {
          needs: ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare'],
          wants: ['Entertainment', 'Shopping', 'Dining Out', 'Hobbies'],
          savings: ['Emergency Fund', 'Investments', 'Savings']
        }
      },
      {
        name: '60/20/20 Rule',
        description: '60% Living Expenses, 20% Savings, 20% Discretionary',
        allocations: {
          living: { percentage: 60, amount: income * 0.6 },
          savings: { percentage: 20, amount: income * 0.2 },
          discretionary: { percentage: 20, amount: income * 0.2 }
        },
        suggested_categories: {
          living: ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare'],
          savings: ['Emergency Fund', 'Investments', 'Savings'],
          discretionary: ['Entertainment', 'Shopping', 'Dining Out', 'Travel']
        }
      },
      {
        name: '70/20/10 Rule',
        description: '70% Living Expenses, 20% Savings, 10% Fun',
        allocations: {
          living: { percentage: 70, amount: income * 0.7 },
          savings: { percentage: 20, amount: income * 0.2 },
          fun: { percentage: 10, amount: income * 0.1 }
        },
        suggested_categories: {
          living: ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare'],
          savings: ['Emergency Fund', 'Investments', 'Savings'],
          fun: ['Entertainment', 'Dining Out', 'Hobbies', 'Travel']
        }
      },
      {
        name: 'Zero-Based Budget',
        description: 'Allocate every dollar to a category',
        allocations: {
          essentials: { percentage: 55, amount: income * 0.55 },
          financial: { percentage: 25, amount: income * 0.25 },
          lifestyle: { percentage: 20, amount: income * 0.2 }
        },
        suggested_categories: {
          essentials: ['Housing', 'Food', 'Transportation', 'Utilities'],
          financial: ['Debt Repayment', 'Emergency Fund', 'Investments', 'Savings'],
          lifestyle: ['Entertainment', 'Shopping', 'Dining Out', 'Personal Care']
        }
      }
    ];

    res.json({ 
      templates,
      monthly_income: income,
      currency: userCurrency
    });
  } catch (error) {
    console.error('Budget templates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply rollover: carry over remaining budget from previous month
router.post('/rollover', async (req, res) => {
  try {
    const { from_month, from_year, to_month, to_year, category_ids } = req.body;
    
    if (!from_month || !from_year || !to_month || !to_year) {
      return res.status(400).json({ error: 'All date parameters are required' });
    }

    // Get user's preferred currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );
    const userCurrency = userResult.rows[0]?.currency || 'USD';

    // Get budgets and spending from previous month
    const budgetsQuery = category_ids && category_ids.length > 0
      ? `SELECT b.id, b.category_id, b.amount, b.currency,
           COALESCE((SELECT SUM(amount) FROM transactions t 
             WHERE t.user_id = $1 AND t.category_id = b.category_id 
             AND t.type = 'expense' AND t.currency = $5
             AND EXTRACT(MONTH FROM t.transaction_date) = $2
             AND EXTRACT(YEAR FROM t.transaction_date) = $3), 0) as spent
         FROM budgets b
         WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
         AND b.category_id = ANY($6)`
      : `SELECT b.id, b.category_id, b.amount, b.currency,
           COALESCE((SELECT SUM(amount) FROM transactions t 
             WHERE t.user_id = $1 AND t.category_id = b.category_id 
             AND t.type = 'expense' AND t.currency = $5
             AND EXTRACT(MONTH FROM t.transaction_date) = $2
             AND EXTRACT(YEAR FROM t.transaction_date) = $3), 0) as spent
         FROM budgets b
         WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3`;

    const params = category_ids && category_ids.length > 0
      ? [req.user.id, from_month, from_year, to_month, userCurrency, category_ids]
      : [req.user.id, from_month, from_year, to_month, userCurrency];

    const oldBudgets = await pool.query(budgetsQuery, params);

    const rollovers = [];

    for (const budget of oldBudgets.rows) {
      const remaining = parseFloat(budget.amount) - parseFloat(budget.spent);
      
      if (remaining > 0) {
        // Check if budget already exists for target month
        const existingBudget = await pool.query(
          `SELECT id, amount FROM budgets 
           WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4`,
          [req.user.id, budget.category_id, to_month, to_year]
        );

        if (existingBudget.rows.length > 0) {
          // Update existing budget by adding rollover amount
          const newAmount = parseFloat(existingBudget.rows[0].amount) + remaining;
          await pool.query(
            `UPDATE budgets SET amount = $1, updated_at = NOW()
             WHERE id = $2`,
            [newAmount, existingBudget.rows[0].id]
          );

          rollovers.push({
            category_id: budget.category_id,
            rollover_amount: remaining,
            previous_amount: parseFloat(existingBudget.rows[0].amount),
            new_amount: newAmount,
            action: 'updated'
          });
        } else {
          // Create new budget with rollover amount
          await pool.query(
            `INSERT INTO budgets (user_id, category_id, amount, currency, month, year)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, budget.category_id, remaining, userCurrency, to_month, to_year]
          );

          rollovers.push({
            category_id: budget.category_id,
            rollover_amount: remaining,
            new_amount: remaining,
            action: 'created'
          });
        }
      }
    }

    res.json({ 
      message: 'Budgets rolled over successfully',
      rollovers,
      from: { month: from_month, year: from_year },
      to: { month: to_month, year: to_year },
      currency: userCurrency
    });
  } catch (error) {
    console.error('Budget rollover error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;


