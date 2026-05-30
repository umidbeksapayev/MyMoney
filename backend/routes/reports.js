import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { convertCurrency } from '../utils/currency.js';

const router = express.Router();
router.use(authMiddleware);

// Get overview stats
router.get('/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Total income and expense
    const totalsResult = await pool.query(
      `SELECT 
        type,
        COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = $1 
       AND transaction_date >= $2 
       AND transaction_date <= $3
       GROUP BY type`,
      [req.user.id, start_date, end_date]
    );

    const totals = {
      income: 0,
      expense: 0
    };

    totalsResult.rows.forEach(row => {
      totals[row.type] = parseFloat(row.total);
    });

    totals.balance = totals.income - totals.expense;

    // By category
    const byCategoryResult = await pool.query(
      `SELECT 
        t.type,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as transaction_count
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 
       AND t.transaction_date >= $2 
       AND t.transaction_date <= $3
       GROUP BY t.type, c.id, c.name, c.color, c.icon
       ORDER BY total DESC`,
      [req.user.id, start_date, end_date]
    );

    const byCategory = {
      income: [],
      expense: []
    };

    byCategoryResult.rows.forEach(row => {
      byCategory[row.type].push({
        category_id: row.category_id,
        category_name: row.category_name || 'Uncategorized',
        category_color: row.category_color || '#64748B',
        category_icon: row.category_icon || 'folder',
        total: parseFloat(row.total),
        transaction_count: parseInt(row.transaction_count)
      });
    });

    res.json({
      totals,
      byCategory
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get monthly trends
router.get('/trends', async (req, res) => {
  try {
    const { months = 6, currency: displayCurrency } = req.query;
    
    // Get user's default currency if not specified
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';

    const result = await pool.query(
      `SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        type,
        currency,
        COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = $1 
       AND transaction_date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
       GROUP BY TO_CHAR(transaction_date, 'YYYY-MM'), type, currency
       ORDER BY month ASC`,
      [req.user.id]
    );

    // Group by month and convert currencies
    const trends = {};
    
    for (const row of result.rows) {
      if (!trends[row.month]) {
        trends[row.month] = { month: row.month, income: 0, expense: 0 };
      }
      
      // Convert amount to target currency
      const convertedAmount = await convertCurrency(
        parseFloat(row.total),
        row.currency,
        targetCurrency
      );
      
      trends[row.month][row.type] += convertedAmount;
    }

    const trendsArray = Object.values(trends).map(item => ({
      ...item,
      balance: item.income - item.expense,
      currency: targetCurrency
    }));

    res.json(trendsArray);
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export to CSV
router.get('/export', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        t.transaction_date,
        t.type,
        t.amount,
        c.name as category,
        t.description
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 2;

    if (start_date) {
      query += ` AND t.transaction_date >= $${paramCount++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND t.transaction_date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += ' ORDER BY t.transaction_date DESC';

    const result = await pool.query(query, params);

    // Generate CSV
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Description'];
    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = [
        row.transaction_date,
        row.type,
        row.amount,
        row.category || 'Uncategorized',
        `"${(row.description || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

