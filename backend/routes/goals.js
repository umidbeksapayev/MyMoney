import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all goals
router.get('/', async (req, res) => {
  try {
    const { is_completed, priority } = req.query;
    
    let query = `
      SELECT * FROM saving_goals 
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (is_completed !== undefined) {
      query += ` AND is_completed = $${paramIndex}`;
      params.push(is_completed === 'true');
      paramIndex++;
    }

    if (priority) {
      query += ` AND priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    query += ` ORDER BY is_completed ASC, priority DESC, deadline ASC NULLS LAST, created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single goal
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM saving_goals WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create goal
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('target_amount').isFloat({ min: 0.01 }).withMessage('Target amount must be positive'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Invalid currency code'),
    body('deadline').optional().isISO8601().withMessage('Invalid deadline date'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('icon').optional().trim(),
    body('category').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        target_amount,
        currency = 'USD',
        deadline = null,
        category = null,
        icon = '🎯',
        priority = 'medium',
      } = req.body;

      const result = await pool.query(
        `INSERT INTO saving_goals 
         (user_id, name, target_amount, currency, deadline, category, icon, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [req.user.id, name, target_amount, currency, deadline, category, icon, priority]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update goal
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('target_amount').optional().isFloat({ min: 0.01 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('deadline').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('icon').optional().trim(),
    body('category').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const fields = req.body;

      // Build dynamic update query
      const updates = [];
      const values = [id, req.user.id];
      let paramIndex = 3;

      Object.keys(fields).forEach((key) => {
        if (fields[key] !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(fields[key]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const result = await pool.query(
        `UPDATE saving_goals 
         SET ${updates.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update goal error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM saving_goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add contribution
router.post(
  '/:id/contribute',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('contribution_date').optional().isISO8601(),
    body('note').optional().trim(),
    body('transaction_id').optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const {
        amount,
        currency = 'USD',
        contribution_date = new Date().toISOString().split('T')[0],
        note = null,
        transaction_id = null,
      } = req.body;

      await client.query('BEGIN');

      // Check if goal exists
      const goalResult = await client.query(
        'SELECT * FROM saving_goals WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (goalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Goal not found' });
      }

      const goal = goalResult.rows[0];

      // Insert contribution
      await client.query(
        `INSERT INTO saving_goals_contributions 
         (goal_id, user_id, amount, currency, contribution_date, note, transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, req.user.id, amount, currency, contribution_date, note, transaction_id]
      );

      // Update goal current_amount
      const newCurrentAmount = parseFloat(goal.current_amount) + parseFloat(amount);
      const isCompleted = newCurrentAmount >= parseFloat(goal.target_amount);

      const updatedGoal = await client.query(
        `UPDATE saving_goals 
         SET current_amount = $1, is_completed = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [newCurrentAmount, isCompleted, id]
      );

      await client.query('COMMIT');
      res.json(updatedGoal.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Add contribution error:', error);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  }
);

// Withdraw from goal
router.post(
  '/:id/withdraw',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('contribution_date').optional().isISO8601(),
    body('note').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const {
        amount,
        currency = 'USD',
        contribution_date = new Date().toISOString().split('T')[0],
        note = null,
      } = req.body;

      await client.query('BEGIN');

      // Check if goal exists
      const goalResult = await client.query(
        'SELECT * FROM saving_goals WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (goalResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Goal not found' });
      }

      const goal = goalResult.rows[0];

      // Check if enough balance
      if (parseFloat(goal.current_amount) < parseFloat(amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Insert negative contribution (withdrawal)
      await client.query(
        `INSERT INTO saving_goals_contributions 
         (goal_id, user_id, amount, currency, contribution_date, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user.id, -amount, currency, contribution_date, note]
      );

      // Update goal current_amount
      const newCurrentAmount = parseFloat(goal.current_amount) - parseFloat(amount);

      const updatedGoal = await client.query(
        `UPDATE saving_goals 
         SET current_amount = $1, is_completed = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [newCurrentAmount, id]
      );

      await client.query('COMMIT');
      res.json(updatedGoal.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Withdraw error:', error);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  }
);

// Get contributions for a goal
router.get('/:id/contributions', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify goal belongs to user
    const goalCheck = await pool.query(
      'SELECT id FROM saving_goals WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const result = await pool.query(
      `SELECT * FROM saving_goals_contributions 
       WHERE goal_id = $1 
       ORDER BY contribution_date DESC, created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark goal as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE saving_goals 
       SET is_completed = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
