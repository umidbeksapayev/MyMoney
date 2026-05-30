import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { convertCurrency, POPULAR_CURRENCIES } from '../utils/currency.js';

const router = express.Router();

// Helper: Check if user has permission in family
async function checkFamilyPermission(familyId, userId, requiredRoles = ['owner', 'admin', 'member']) {
  const { rows } = await pool.query(
    'SELECT role, status FROM family_members WHERE family_id = $1 AND user_id = $2',
    [familyId, userId]
  );
  
  if (rows.length === 0 || rows[0].status !== 'active') {
    return { hasPermission: false, role: null };
  }
  
  return { 
    hasPermission: requiredRoles.includes(rows[0].role), 
    role: rows[0].role 
  };
}

// Get family budgets
router.get('/:familyId/budgets', authMiddleware, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;
    const { currency: displayCurrency } = req.query;

    const targetCurrency = displayCurrency || 'USD';

    const { hasPermission } = await checkFamilyPermission(familyId, userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: budgets } = await pool.query(
      `SELECT 
         fb.id, fb.name, fb.amount, fb.currency, fb.period,
         fb.start_date, fb.end_date, fb.created_at,
         c.id as category_id, c.name as category_name, c.icon as category_icon,
         u.full_name as created_by_name,
         COALESCE(SUM(t.amount), 0) as spent
       FROM family_budgets fb
       LEFT JOIN categories c ON fb.category_id = c.id
       LEFT JOIN users u ON fb.created_by = u.id
       LEFT JOIN family_transactions ft ON ft.family_id = fb.family_id
       LEFT JOIN transactions t ON t.id = ft.transaction_id 
         AND t.category_id = fb.category_id
         AND t.type = 'expense'
         AND t.date >= fb.start_date
         AND (fb.end_date IS NULL OR t.date <= fb.end_date)
       WHERE fb.family_id = $1
       GROUP BY fb.id, fb.name, fb.amount, fb.currency, fb.period,
                fb.start_date, fb.end_date, fb.created_at,
                c.id, c.name, c.icon, u.full_name
       ORDER BY fb.created_at DESC`,
      [familyId]
    );

    // Convert amounts
    const convertedBudgets = await Promise.all(
      budgets.map(async (budget) => {
        const convertedAmount = await convertCurrency(budget.amount, budget.currency, targetCurrency);
        const convertedSpent = await convertCurrency(budget.spent, budget.currency, targetCurrency);
        
        return {
          ...budget,
          amount: convertedAmount,
          spent: convertedSpent,
          remaining: convertedAmount - convertedSpent,
          percentage: (convertedSpent / convertedAmount * 100).toFixed(1),
          display_currency: targetCurrency
        };
      })
    );

    res.json({ budgets: convertedBudgets, currency: targetCurrency });
  } catch (error) {
    console.error('Error fetching family budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Create family budget
router.post('/:familyId/budgets', authMiddleware, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;
    const { name, amount, currency = 'USD', category_id, period = 'monthly', start_date, end_date } = req.body;

    const { hasPermission } = await checkFamilyPermission(familyId, userId, ['owner', 'admin']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only owners and admins can create budgets' });
    }

    if (!name || !amount || !start_date) {
      return res.status(400).json({ error: 'Name, amount, and start_date are required' });
    }

    // Validate currency (POPULAR_CURRENCIES is array of objects)
    const validCurrency = POPULAR_CURRENCIES.find(c => c.code === currency);
    if (!validCurrency) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const { rows } = await pool.query(
      `INSERT INTO family_budgets 
       (family_id, name, amount, currency, category_id, period, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [familyId, name, amount, currency, category_id || null, period, start_date, end_date || null, userId]
    );

    res.status(201).json({
      message: 'Family budget created successfully',
      budget: rows[0]
    });
  } catch (error) {
    console.error('Error creating family budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// Update family budget
router.put('/:familyId/budgets/:budgetId', authMiddleware, async (req, res) => {
  try {
    const { familyId, budgetId } = req.params;
    const userId = req.user.id;
    const { name, amount, currency, category_id, period, start_date, end_date } = req.body;

    const { hasPermission } = await checkFamilyPermission(familyId, userId, ['owner', 'admin']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only owners and admins can update budgets' });
    }

    const { rows } = await pool.query(
      `UPDATE family_budgets
       SET name = COALESCE($1, name),
           amount = COALESCE($2, amount),
           currency = COALESCE($3, currency),
           category_id = COALESCE($4, category_id),
           period = COALESCE($5, period),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date)
       WHERE id = $8 AND family_id = $9
       RETURNING *`,
      [name, amount, currency, category_id, period, start_date, end_date, budgetId, familyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({
      message: 'Budget updated successfully',
      budget: rows[0]
    });
  } catch (error) {
    console.error('Error updating family budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Delete family budget
router.delete('/:familyId/budgets/:budgetId', authMiddleware, async (req, res) => {
  try {
    const { familyId, budgetId } = req.params;
    const userId = req.user.id;

    const { hasPermission } = await checkFamilyPermission(familyId, userId, ['owner', 'admin']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only owners and admins can delete budgets' });
    }

    const { rowCount } = await pool.query(
      'DELETE FROM family_budgets WHERE id = $1 AND family_id = $2',
      [budgetId, familyId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting family budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// Get family goals
router.get('/:familyId/goals', authMiddleware, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;
    const { currency: displayCurrency } = req.query;

    const targetCurrency = displayCurrency || 'USD';

    const { hasPermission } = await checkFamilyPermission(familyId, userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows: goals } = await pool.query(
      `SELECT 
         fg.id, fg.name, fg.description, fg.target_amount, fg.current_amount,
         fg.currency, fg.target_date, fg.status, fg.created_at,
         u.full_name as created_by_name,
         COUNT(DISTINCT fgc.id) as contribution_count
       FROM family_goals fg
       LEFT JOIN users u ON fg.created_by = u.id
       LEFT JOIN family_goal_contributions fgc ON fgc.goal_id = fg.id
       WHERE fg.family_id = $1
       GROUP BY fg.id, fg.name, fg.description, fg.target_amount, fg.current_amount,
                fg.currency, fg.target_date, fg.status, fg.created_at, u.full_name
       ORDER BY 
         CASE fg.status 
           WHEN 'active' THEN 1
           WHEN 'paused' THEN 2
           WHEN 'completed' THEN 3
           ELSE 4
         END,
         fg.created_at DESC`,
      [familyId]
    );

    // Get contributions for each goal
    const goalsWithContributions = await Promise.all(
      goals.map(async (goal) => {
        const { rows: contributions } = await pool.query(
          `SELECT 
             fgc.id, fgc.amount, fgc.currency, fgc.contributed_at, fgc.note,
             u.full_name as contributor_name
           FROM family_goal_contributions fgc
           LEFT JOIN users u ON fgc.user_id = u.id
           WHERE fgc.goal_id = $1
           ORDER BY fgc.contributed_at DESC`,
          [goal.id]
        );

        const convertedTarget = await convertCurrency(goal.target_amount, goal.currency, targetCurrency);
        const convertedCurrent = await convertCurrency(goal.current_amount, goal.currency, targetCurrency);

        return {
          ...goal,
          target_amount: convertedTarget,
          current_amount: convertedCurrent,
          remaining: convertedTarget - convertedCurrent,
          percentage: (convertedCurrent / convertedTarget * 100).toFixed(1),
          display_currency: targetCurrency,
          contributions
        };
      })
    );

    res.json({ goals: goalsWithContributions, currency: targetCurrency });
  } catch (error) {
    console.error('Error fetching family goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create family goal
router.post('/:familyId/goals', authMiddleware, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;
    const { name, description, target_amount, currency = 'USD', target_date } = req.body;

    const { hasPermission } = await checkFamilyPermission(familyId, userId, ['owner', 'admin', 'member']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!name || !target_amount) {
      return res.status(400).json({ error: 'Name and target amount are required' });
    }

    // Validate currency (POPULAR_CURRENCIES is array of objects)
    const validCurrency = POPULAR_CURRENCIES.find(c => c.code === currency);
    if (!validCurrency) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const { rows } = await pool.query(
      `INSERT INTO family_goals 
       (family_id, name, description, target_amount, currency, target_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [familyId, name, description || null, target_amount, currency, target_date || null, userId]
    );

    res.status(201).json({
      message: 'Family goal created successfully',
      goal: rows[0]
    });
  } catch (error) {
    console.error('Error creating family goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Contribute to family goal
router.post('/:familyId/goals/:goalId/contribute', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { familyId, goalId } = req.params;
    const userId = req.user.id;
    const { amount, currency = 'USD', note } = req.body;

    const { hasPermission } = await checkFamilyPermission(familyId, userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    await client.query('BEGIN');

    // Get goal
    const { rows: goalRows } = await client.query(
      'SELECT * FROM family_goals WHERE id = $1 AND family_id = $2',
      [goalId, familyId]
    );

    if (goalRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Goal not found' });
    }

    const goal = goalRows[0];

    if (goal.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only contribute to active goals' });
    }

    // Convert contribution to goal currency
    const convertedAmount = await convertCurrency(amount, currency, goal.currency);

    // Add contribution
    await client.query(
      `INSERT INTO family_goal_contributions (goal_id, user_id, amount, currency, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [goalId, userId, amount, currency, note || null]
    );

    // Update goal current amount
    const newCurrent = parseFloat(goal.current_amount) + convertedAmount;
    await client.query(
      'UPDATE family_goals SET current_amount = $1 WHERE id = $2',
      [newCurrent, goalId]
    );

    // Check if goal is completed
    if (newCurrent >= parseFloat(goal.target_amount)) {
      await client.query(
        "UPDATE family_goals SET status = 'completed' WHERE id = $1",
        [goalId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Contribution added successfully',
      newAmount: newCurrent,
      goalCompleted: newCurrent >= parseFloat(goal.target_amount)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding contribution:', error);
    res.status(500).json({ error: 'Failed to add contribution' });
  } finally {
    client.release();
  }
});

// Update family goal
router.put('/:familyId/goals/:goalId', authMiddleware, async (req, res) => {
  try {
    const { familyId, goalId } = req.params;
    const userId = req.user.id;
    const { name, description, target_amount, currency, target_date, status } = req.body;

    const { hasPermission } = await checkFamilyPermission(familyId, userId, ['owner', 'admin']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only owners and admins can update goals' });
    }

    const { rows } = await pool.query(
      `UPDATE family_goals
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           target_amount = COALESCE($3, target_amount),
           currency = COALESCE($4, currency),
           target_date = COALESCE($5, target_date),
           status = COALESCE($6, status)
       WHERE id = $7 AND family_id = $8
       RETURNING *`,
      [name, description, target_amount, currency, target_date, status, goalId, familyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      message: 'Goal updated successfully',
      goal: rows[0]
    });
  } catch (error) {
    console.error('Error updating family goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete family goal
router.delete('/:familyId/goals/:goalId', authMiddleware, async (req, res) => {
  try {
    const { familyId, goalId } = req.params;
    const userId = req.user.id;

    const { hasPermission } = await checkFamilyPermission(familyId, userId, ['owner', 'admin']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only owners and admins can delete goals' });
    }

    const { rowCount } = await pool.query(
      'DELETE FROM family_goals WHERE id = $1 AND family_id = $2',
      [goalId, familyId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting family goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export default router;
