import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM categories WHERE user_id = $1';
    const params = [req.user.id];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category
router.post('/',
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['income', 'expense']),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i),
    body('icon').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, type, color, icon } = req.body;

      const result = await pool.query(
        `INSERT INTO categories (user_id, name, type, color, icon) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [req.user.id, name, type, color || '#3B82F6', icon || 'folder']
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update category
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i),
    body('icon').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, color, icon } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (color) {
        updates.push(`color = $${paramCount++}`);
        values.push(color);
      }
      if (icon) {
        updates.push(`icon = $${paramCount++}`);
        values.push(icon);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id, req.user.id);

      const result = await pool.query(
        `UPDATE categories 
         SET ${updates.join(', ')} 
         WHERE id = $${paramCount++} AND user_id = $${paramCount} 
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

