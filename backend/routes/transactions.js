import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { convertCurrency } from '../utils/currency.js';

const router = express.Router();
router.use(authMiddleware);

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const { type, category_id, start_date, end_date, limit = 100, offset = 0, display_currency } = req.query;
    
    // Get user's preferred currency if not specified
    let targetCurrency = display_currency;
    if (!targetCurrency) {
      const userResult = await pool.query(
        'SELECT currency FROM users WHERE id = $1',
        [req.user.id]
      );
      targetCurrency = userResult.rows[0]?.currency || 'USD';
    }
    
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 2;

    if (type) {
      query += ` AND t.type = $${paramCount++}`;
      params.push(type);
    }

    if (category_id) {
      query += ` AND t.category_id = $${paramCount++}`;
      params.push(category_id);
    }

    if (start_date) {
      query += ` AND t.transaction_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND t.transaction_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Convert amounts to target currency
    const convertedTransactions = await Promise.all(
      result.rows.map(async (transaction) => {
        if (transaction.currency === targetCurrency) {
          // No conversion needed
          return {
            ...transaction,
            original_amount: transaction.amount,
            original_currency: transaction.currency,
            converted_amount: transaction.amount,
            display_currency: targetCurrency
          };
        } else {
          // Convert to target currency
          try {
            const convertedAmount = await convertCurrency(
              parseFloat(transaction.amount),
              transaction.currency,
              targetCurrency
            );
            return {
              ...transaction,
              original_amount: transaction.amount,
              original_currency: transaction.currency,
              amount: convertedAmount, // Override amount with converted value
              currency: targetCurrency, // Override currency to display currency
              converted_amount: convertedAmount,
              display_currency: targetCurrency
            };
          } catch (error) {
            console.error(`Currency conversion error for transaction ${transaction.id}:`, error);
            // Return original if conversion fails
            return {
              ...transaction,
              original_amount: transaction.amount,
              original_currency: transaction.currency,
              converted_amount: transaction.amount,
              display_currency: transaction.currency
            };
          }
        }
      })
    );
    
    res.json({ transactions: convertedTransactions, count: convertedTransactions.length });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create transaction
router.post('/',
  [
    body('type').isIn(['income', 'expense']),
    body('amount').isFloat({ min: 0.01, max: 999999999999.99 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('transaction_date').isDate(),
    body('category_id').optional({ nullable: true, checkFalsy: true }).isInt(),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, amount, currency, transaction_date, category_id, description } = req.body;
      
      console.log('📥 Creating transaction:', { type, amount, currency, transaction_date, category_id, description });

      // Verify category belongs to user if provided
      if (category_id) {
        const catResult = await pool.query(
          'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
          [category_id, req.user.id]
        );
        if (catResult.rows.length === 0) {
          console.log('❌ Invalid category:', category_id);
          return res.status(400).json({ error: 'Invalid category' });
        }
      }

      const result = await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, transaction_date, category_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, type, amount, currency || 'USD', transaction_date, category_id || null, description || null]
      );

      console.log('✅ Transaction created:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('❌ Create transaction error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update transaction
router.put('/:id',
  [
    body('type').optional().isIn(['income', 'expense']),
    body('amount').optional().isFloat({ min: 0.01, max: 999999999999.99 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('transaction_date').optional().isDate(),
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
      const { type, amount, currency, transaction_date, category_id, description } = req.body;

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
      if (transaction_date) {
        updates.push(`transaction_date = $${paramCount++}`);
        values.push(transaction_date);
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
        `UPDATE transactions 
         SET ${updates.join(', ')} 
         WHERE id = $${paramCount++} AND user_id = $${paramCount} 
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete test transactions (keep only real ones)
router.post('/bulk-delete-test', async (req, res) => {
  try {
    const { keep_ids = [] } = req.body; // Array of transaction IDs to keep
    
    let query = 'DELETE FROM transactions WHERE user_id = $1';
    const params = [req.user.id];
    
    if (keep_ids.length > 0) {
      query += ` AND id NOT IN (${keep_ids.map((_, i) => `$${i + 2}`).join(',')})`;
      params.push(...keep_ids);
    }
    
    query += ' RETURNING id';
    
    const result = await pool.query(query, params);
    
    res.json({ 
      message: 'Test transactions deleted successfully',
      deleted_count: result.rows.length,
      deleted_ids: result.rows.map(r => r.id)
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

