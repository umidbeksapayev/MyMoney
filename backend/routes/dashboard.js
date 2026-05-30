import express from 'express';
import pool from '../config/database.js';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Helper function to convert amount to display currency
async function convertToDisplayCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  try {
    // Use the same exchange rate cache as other parts of the app
    const cacheKey = `exchange_rate_${fromCurrency}_to_${toCurrency}`;
    const cached = global.exchangeRateCache?.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return amount * cached.rate;
    }

    // Fetch from API
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'demo';
    const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${fromCurrency}/${toCurrency}`;
    
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (data.result === 'success') {
      const rate = data.conversion_rate;
      
      // Cache the rate
      if (!global.exchangeRateCache) {
        global.exchangeRateCache = new Map();
      }
      global.exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() });
      
      return amount * rate;
    }
    
    return amount; // Fallback to original amount
  } catch (error) {
    console.error('Currency conversion error:', error);
    return amount;
  }
}

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const displayCurrency = req.query.currency || 'USD';
    
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. THIS WEEK vs LAST WEEK
    const weekStats = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total,
        currency,
        CASE 
          WHEN transaction_date >= $1 THEN 'this_week'
          ELSE 'last_week'
        END as period
      FROM transactions
      WHERE user_id = $2 
        AND transaction_date >= $3
        AND transaction_date < NOW()
      GROUP BY type, currency, period
    `, [startOfThisWeek, userId, startOfLastWeek]);

    // Convert and aggregate
    let thisWeekIncome = 0, thisWeekExpense = 0;
    let lastWeekIncome = 0, lastWeekExpense = 0;

    for (const row of weekStats.rows) {
      const converted = await convertToDisplayCurrency(
        parseFloat(row.total), 
        row.currency, 
        displayCurrency
      );
      
      if (row.period === 'this_week') {
        if (row.type === 'income') thisWeekIncome += converted;
        else thisWeekExpense += converted;
      } else {
        if (row.type === 'income') lastWeekIncome += converted;
        else lastWeekExpense += converted;
      }
    }

    // 2. THIS MONTH TOTALS
    const monthStats = await pool.query(`
      SELECT type, SUM(amount) as total, currency
      FROM transactions
      WHERE user_id = $1 AND transaction_date >= $2
      GROUP BY type, currency
    `, [userId, startOfThisMonth]);

    let thisMonthIncome = 0, thisMonthExpense = 0;
    for (const row of monthStats.rows) {
      const converted = await convertToDisplayCurrency(
        parseFloat(row.total), 
        row.currency, 
        displayCurrency
      );
      if (row.type === 'income') thisMonthIncome += converted;
      else thisMonthExpense += converted;
    }

    // 3. TOP 5 SPENDING CATEGORIES
    const topCategories = await pool.query(`
      SELECT 
        c.name,
        c.color,
        c.icon,
        SUM(t.amount) as total,
        t.currency,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.type = 'expense'
        AND t.transaction_date >= $2
      GROUP BY c.id, c.name, c.color, c.icon, t.currency
      ORDER BY total DESC
    `, [userId, startOfThisMonth]);

    // Group by category and convert
    const categoryMap = new Map();
    for (const row of topCategories.rows) {
      const converted = await convertToDisplayCurrency(
        parseFloat(row.total),
        row.currency,
        displayCurrency
      );
      
      if (categoryMap.has(row.name)) {
        const existing = categoryMap.get(row.name);
        existing.total += converted;
        existing.transaction_count += parseInt(row.transaction_count);
      } else {
        categoryMap.set(row.name, {
          name: row.name,
          color: row.color,
          icon: row.icon,
          total: converted,
          transaction_count: parseInt(row.transaction_count)
        });
      }
    }

    const topCategoriesConverted = Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 4. SAVINGS RATE & NET WORTH
    const thisMonthSavings = thisMonthIncome - thisMonthExpense;
    const savingsRate = thisMonthIncome > 0 
      ? ((thisMonthSavings / thisMonthIncome) * 100).toFixed(1)
      : 0;

    // Get total saved in goals
    const goalsResult = await pool.query(`
      SELECT SUM(current_amount) as total_saved, currency
      FROM saving_goals
      WHERE user_id = $1 AND is_completed = false
      GROUP BY currency
    `, [userId]);

    let totalGoalsSaved = 0;
    for (const row of goalsResult.rows) {
      const converted = await convertToDisplayCurrency(
        parseFloat(row.total_saved || 0),
        row.currency,
        displayCurrency
      );
      totalGoalsSaved += converted;
    }

    // Get budget remaining
    const budgetsResult = await pool.query(`
      SELECT 
        b.amount as budget_amount,
        b.currency as budget_currency,
        COALESCE(SUM(t.amount), 0) as spent,
        t.currency as spent_currency
      FROM budgets b
      LEFT JOIN transactions t ON b.category_id = t.category_id 
        AND t.type = 'expense'
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', b.month)
        AND t.user_id = b.user_id
      WHERE b.user_id = $1
        AND DATE_TRUNC('month', b.month) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY b.id, b.amount, b.currency, t.currency
    `, [userId]);

    let totalBudgetRemaining = 0;
    for (const row of budgetsResult.rows) {
      const budgetConverted = await convertToDisplayCurrency(
        parseFloat(row.budget_amount),
        row.budget_currency,
        displayCurrency
      );
      const spentConverted = row.spent_currency ? await convertToDisplayCurrency(
        parseFloat(row.spent),
        row.spent_currency,
        displayCurrency
      ) : 0;
      
      totalBudgetRemaining += Math.max(0, budgetConverted - spentConverted);
    }

    const netWorth = totalGoalsSaved + totalBudgetRemaining;

    // 5. FINANCIAL HEALTH SCORE (0-100)
    // Algorithm:
    // - Savings rate: 40% weight (0 if negative, 100 if >50%)
    // - Budget adherence: 30% weight (100 if all budgets healthy)
    // - Goals progress: 30% weight (average completion %)

    const savingsScore = Math.min(100, Math.max(0, (parseFloat(savingsRate) / 50) * 100));

    // Budget health: % of budgets not exceeded
    const budgetHealthResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE spent < budget_amount) as healthy_count,
        COUNT(*) as total_count
      FROM (
        SELECT 
          b.amount as budget_amount,
          COALESCE(SUM(t.amount), 0) as spent
        FROM budgets b
        LEFT JOIN transactions t ON b.category_id = t.category_id 
          AND t.type = 'expense'
          AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', b.month)
          AND t.user_id = b.user_id
        WHERE b.user_id = $1
          AND DATE_TRUNC('month', b.month) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY b.id, b.amount
      ) AS budget_health
    `, [userId]);

    const budgetScore = budgetHealthResult.rows[0].total_count > 0
      ? (budgetHealthResult.rows[0].healthy_count / budgetHealthResult.rows[0].total_count) * 100
      : 50; // Default to 50 if no budgets

    // Goals progress
    const goalsProgressResult = await pool.query(`
      SELECT AVG(
        CASE 
          WHEN target_amount > 0 THEN (current_amount / target_amount) * 100
          ELSE 0
        END
      ) as avg_progress
      FROM saving_goals
      WHERE user_id = $1 AND is_completed = false
    `, [userId]);

    const goalsScore = parseFloat(goalsProgressResult.rows[0].avg_progress || 0);

    const healthScore = Math.round(
      (savingsScore * 0.4) + (budgetScore * 0.3) + (goalsScore * 0.3)
    );

    // 6. RECENT ACTIVITY (last 5 transactions)
    const recentTransactions = await pool.query(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.currency,
        t.transaction_date,
        t.description,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT 5
    `, [userId]);

    // 7. UPCOMING RECURRING TRANSACTIONS (next 7 days)
    const upcomingRecurring = await pool.query(`
      SELECT 
        r.id,
        r.type,
        r.amount,
        r.currency,
        r.frequency,
        r.next_date,
        r.description,
        c.name as category_name,
        c.color as category_color
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = $1 
        AND r.is_active = true
        AND r.next_date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY r.next_date ASC
      LIMIT 3
    `, [userId]);

    // 8. GOALS NEAR DEADLINE (within 30 days)
    const goalsNearDeadline = await pool.query(`
      SELECT 
        id,
        name,
        target_amount,
        current_amount,
        currency,
        deadline,
        icon,
        priority
      FROM saving_goals
      WHERE user_id = $1 
        AND is_completed = false
        AND deadline IS NOT NULL
        AND deadline <= CURRENT_DATE + INTERVAL '30 days'
        AND deadline >= CURRENT_DATE
      ORDER BY deadline ASC
      LIMIT 3
    `, [userId]);

    // RESPONSE
    res.json({
      currency: displayCurrency,
      week: {
        income: {
          current: thisWeekIncome,
          previous: lastWeekIncome,
          change: lastWeekIncome > 0 
            ? (((thisWeekIncome - lastWeekIncome) / lastWeekIncome) * 100).toFixed(1)
            : 0
        },
        expense: {
          current: thisWeekExpense,
          previous: lastWeekExpense,
          change: lastWeekExpense > 0
            ? (((thisWeekExpense - lastWeekExpense) / lastWeekExpense) * 100).toFixed(1)
            : 0
        }
      },
      month: {
        income: thisMonthIncome,
        expense: thisMonthExpense,
        savings: thisMonthSavings,
        savingsRate: parseFloat(savingsRate)
      },
      topCategories: topCategoriesConverted,
      netWorth: {
        total: netWorth,
        goalsSaved: totalGoalsSaved,
        budgetRemaining: totalBudgetRemaining
      },
      healthScore: {
        total: healthScore,
        breakdown: {
          savings: Math.round(savingsScore),
          budgets: Math.round(budgetScore),
          goals: Math.round(goalsScore)
        }
      },
      recentActivity: {
        transactions: recentTransactions.rows,
        recurringUpcoming: upcomingRecurring.rows,
        goalsNearDeadline: goalsNearDeadline.rows
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
