import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all recurring transactions
router.get('/', async (req, res) => {
  try {
    const { is_active } = req.query;
    
    let query = `
      SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = $1
    `;
    const params = [req.user.id];

    if (is_active !== undefined) {
      query += ` AND r.is_active = $2`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY r.next_occurrence ASC, r.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get recurring transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recurring transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get recurring transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create recurring transaction
router.post('/',
  [
    body('type').isIn(['income', 'expense']),
    body('amount').isFloat({ min: 0.01, max: 999999999999.99 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('frequency').isIn(['daily', 'weekly', 'monthly', 'yearly']),
    body('start_date').isISO8601().toDate(),
    body('end_date').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
    body('category_id').optional({ nullable: true, checkFalsy: true }).isInt(),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        type, 
        amount, 
        currency, 
        frequency, 
        start_date, 
        end_date, 
        category_id, 
        description 
      } = req.body;

      // Verify category belongs to user if provided
      if (category_id) {
        const catResult = await pool.query(
          'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
          [category_id, req.user.id]
        );
        if (catResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid category' });
        }
      }

      // Validate end_date is after start_date
      if (end_date && new Date(end_date) <= new Date(start_date)) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }

      const result = await pool.query(
        `INSERT INTO recurring_transactions 
         (user_id, type, amount, currency, frequency, start_date, end_date, next_occurrence, category_id, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         RETURNING *`,
        [
          req.user.id, 
          type, 
          amount, 
          currency || 'USD', 
          frequency, 
          start_date, 
          end_date || null, 
          start_date, // next_occurrence initially = start_date
          category_id || null, 
          description || null
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create recurring transaction error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update recurring transaction
router.put('/:id',
  [
    body('type').optional().isIn(['income', 'expense']),
    body('amount').optional().isFloat({ min: 0.01, max: 999999999999.99 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
    body('start_date').optional().isISO8601().toDate(),
    body('end_date').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate(),
    body('is_active').optional().isBoolean(),
    body('category_id').optional({ nullable: true, checkFalsy: true }).isInt(),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { 
        type, 
        amount, 
        currency, 
        frequency, 
        start_date, 
        end_date, 
        is_active, 
        category_id, 
        description 
      } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (type) {
        updates.push(`type = $${paramCount++}`);
        values.push(type);
      }
      if (amount) {
        updates.push(`amount = $${paramCount++}`);
        values.push(amount);
      }
      if (currency) {
        updates.push(`currency = $${paramCount++}`);
        values.push(currency);
      }
      if (frequency) {
        updates.push(`frequency = $${paramCount++}`);
        values.push(frequency);
      }
      if (start_date) {
        updates.push(`start_date = $${paramCount++}`);
        values.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push(`end_date = $${paramCount++}`);
        values.push(end_date);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }
      if (category_id !== undefined) {
        if (category_id) {
          // Verify category belongs to user
          const catResult = await pool.query(
            'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
            [category_id, req.user.id]
          );
          if (catResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid category' });
          }
        }
        updates.push(`category_id = $${paramCount++}`);
        values.push(category_id);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, req.user.id);

      const result = await pool.query(
        `UPDATE recurring_transactions 
         SET ${updates.join(', ')} 
         WHERE id = $${paramCount++} AND user_id = $${paramCount} 
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recurring transaction not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update recurring transaction error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete recurring transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    res.json({ message: 'Recurring transaction deleted successfully' });
  } catch (error) {
    console.error('Delete recurring transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Toggle recurring ${id} for user ${req.user.id}`);

    const result = await pool.query(
      `UPDATE recurring_transactions 
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Recurring ${id} not found for user ${req.user.id}`);
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    console.log(`✅ Toggled recurring ${id}, is_active: ${result.rows[0].is_active}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle recurring transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

