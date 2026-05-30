import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { convertCurrency } from '../utils/currency.js';

const router = express.Router();

// Get spending anomalies (transactions significantly above average)
router.get('/anomalies', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '3', currency: displayCurrency } = req.query; // Default 3 months
    const monthsBack = parseInt(period);

    // Get user's default currency if not provided
    const userResult = await pool.query('SELECT currency FROM users WHERE id = $1', [userId]);
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get all transactions for the period
    const { rows: transactions } = await pool.query(
      `SELECT t.id, t.amount, t.description, t.category_id, t.transaction_date, t.currency,
              c.name as category_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 
         AND t.type = 'expense'
         AND t.transaction_date >= $2
       ORDER BY t.transaction_date DESC`,
      [userId, startDate]
    );

    if (transactions.length < 5) {
      return res.json({ anomalies: [], message: 'Insufficient data for anomaly detection' });
    }

    // Convert all amounts to target currency
    const convertedTransactions = await Promise.all(
      transactions.map(async (t) => ({
        ...t,
        convertedAmount: await convertCurrency(t.amount, t.currency, targetCurrency)
      }))
    );

    // Calculate category averages
    const categoryStats = {};
    convertedTransactions.forEach(t => {
      const catId = t.category_id || 'uncategorized';
      if (!categoryStats[catId]) {
        categoryStats[catId] = {
          name: t.category_name || 'Uncategorized',
          amounts: [],
          sum: 0,
          count: 0
        };
      }
      categoryStats[catId].amounts.push(t.convertedAmount);
      categoryStats[catId].sum += t.convertedAmount;
      categoryStats[catId].count++;
    });

    // Calculate averages and standard deviations
    Object.keys(categoryStats).forEach(catId => {
      const stat = categoryStats[catId];
      stat.average = stat.sum / stat.count;
      
      // Calculate standard deviation
      const variance = stat.amounts.reduce((acc, amt) => 
        acc + Math.pow(amt - stat.average, 2), 0
      ) / stat.count;
      stat.stdDev = Math.sqrt(variance);
    });

    // Find anomalies (transactions > 2 standard deviations from mean)
    const anomalies = convertedTransactions
      .filter(t => {
        const catId = t.category_id || 'uncategorized';
        const stat = categoryStats[catId];
        const threshold = stat.average + (2 * stat.stdDev);
        return t.convertedAmount > threshold && t.convertedAmount > stat.average * 1.5;
      })
      .map(t => {
        const catId = t.category_id || 'uncategorized';
        const stat = categoryStats[catId];
        return {
          id: t.id,
          amount: t.convertedAmount,
          originalAmount: t.amount,
          originalCurrency: t.currency,
          description: t.description,
          category: t.category_name || 'Uncategorized',
          date: t.transaction_date,
          averageForCategory: stat.average,
          deviationPercent: ((t.convertedAmount - stat.average) / stat.average * 100).toFixed(1),
          severity: t.convertedAmount > stat.average * 3 ? 'high' : 'medium'
        };
      })
      .sort((a, b) => b.amount - a.amount);

    res.json({
      anomalies,
      currency: targetCurrency,
      period: `${monthsBack} months`,
      totalTransactions: transactions.length,
      anomaliesFound: anomalies.length
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Get year-over-year comparison
router.get('/yoy-comparison', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency: displayCurrency } = req.query;

    // Get user's default currency if not provided
    const userResult = await pool.query('SELECT currency FROM users WHERE id = $1', [userId]);
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    // Get current year data
    const { rows: currentYearData } = await pool.query(
      `SELECT 
         EXTRACT(MONTH FROM transaction_date) as month,
         type,
         SUM(amount) as total,
         currency
       FROM transactions
       WHERE user_id = $1 
         AND EXTRACT(YEAR FROM transaction_date) = $2
       GROUP BY EXTRACT(MONTH FROM transaction_date), type, currency
       ORDER BY month`,
      [userId, currentYear]
    );

    // Get last year data
    const { rows: lastYearData } = await pool.query(
      `SELECT 
         EXTRACT(MONTH FROM transaction_date) as month,
         type,
         SUM(amount) as total,
         currency
       FROM transactions
       WHERE user_id = $1 
         AND EXTRACT(YEAR FROM transaction_date) = $2
       GROUP BY EXTRACT(MONTH FROM transaction_date), type, currency
       ORDER BY month`,
      [userId, lastYear]
    );

    // Convert and aggregate by month and type
    const processYearData = async (data, year) => {
      const monthlyData = {};
      
      for (const row of data) {
        const month = parseInt(row.month);
        if (!monthlyData[month]) {
          monthlyData[month] = { month, year, income: 0, expense: 0 };
        }
        
        const convertedAmount = await convertCurrency(
          parseFloat(row.total), 
          row.currency, 
          targetCurrency
        );
        
        if (row.type === 'income') {
          monthlyData[month].income += convertedAmount;
        } else {
          monthlyData[month].expense += convertedAmount;
        }
      }
      
      return Object.values(monthlyData);
    };

    const currentYearMonthly = await processYearData(currentYearData, currentYear);
    const lastYearMonthly = await processYearData(lastYearData, lastYear);

    // Calculate comparison
    const comparison = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let month = 1; month <= 12; month++) {
      const current = currentYearMonthly.find(m => m.month === month) || 
                     { month, income: 0, expense: 0 };
      const last = lastYearMonthly.find(m => m.month === month) || 
                  { month, income: 0, expense: 0 };
      
      const currentNet = current.income - current.expense;
      const lastNet = last.income - last.expense;
      const netChange = lastNet !== 0 
        ? ((currentNet - lastNet) / Math.abs(lastNet) * 100).toFixed(1)
        : null;

      comparison.push({
        month: monthNames[month - 1],
        monthNumber: month,
        currentYear: {
          year: currentYear,
          income: current.income,
          expense: current.expense,
          net: currentNet
        },
        lastYear: {
          year: lastYear,
          income: last.income,
          expense: last.expense,
          net: lastNet
        },
        change: {
          income: last.income !== 0 
            ? ((current.income - last.income) / last.income * 100).toFixed(1)
            : null,
          expense: last.expense !== 0 
            ? ((current.expense - last.expense) / last.expense * 100).toFixed(1)
            : null,
          net: netChange
        }
      });
    }

    // Calculate yearly totals
    const currentYearTotals = currentYearMonthly.reduce((acc, m) => ({
      income: acc.income + m.income,
      expense: acc.expense + m.expense
    }), { income: 0, expense: 0 });

    const lastYearTotals = lastYearMonthly.reduce((acc, m) => ({
      income: acc.income + m.income,
      expense: acc.expense + m.expense
    }), { income: 0, expense: 0 });

    res.json({
      comparison,
      totals: {
        currentYear: {
          year: currentYear,
          ...currentYearTotals,
          net: currentYearTotals.income - currentYearTotals.expense
        },
        lastYear: {
          year: lastYear,
          ...lastYearTotals,
          net: lastYearTotals.income - lastYearTotals.expense
        }
      },
      currency: targetCurrency
    });
  } catch (error) {
    console.error('Error comparing year-over-year:', error);
    res.status(500).json({ error: 'Failed to compare year-over-year data' });
  }
});

// Get spending velocity (burn rate)
router.get('/velocity', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30', currency: displayCurrency } = req.query; // Default 30 days
    const daysBack = parseInt(period);

    // Get user's default currency if not provided
    const userResult = await pool.query('SELECT currency FROM users WHERE id = $1', [userId]);
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get daily spending
    const { rows } = await pool.query(
      `SELECT 
         DATE(transaction_date) as day,
         SUM(amount) as total,
         currency
       FROM transactions
       WHERE user_id = $1 
         AND type = 'expense'
         AND transaction_date >= $2
       GROUP BY DATE(transaction_date), currency
       ORDER BY day DESC`,
      [userId, startDate]
    );

    // Convert all amounts
    let totalSpent = 0;
    const dailySpending = [];
    
    for (const row of rows) {
      const convertedAmount = await convertCurrency(
        parseFloat(row.total),
        row.currency,
        targetCurrency
      );
      totalSpent += convertedAmount;
      
      dailySpending.push({
        date: row.day,
        amount: convertedAmount
      });
    }

    const daysWithData = dailySpending.length;
    const averageDaily = daysWithData > 0 ? totalSpent / daysWithData : 0;
    const projectedMonthly = averageDaily * 30;
    
    // Calculate velocity trend (last 7 days vs previous 7 days)
    const recentDays = dailySpending.slice(0, 7);
    const previousDays = dailySpending.slice(7, 14);
    
    const recentAvg = recentDays.length > 0
      ? recentDays.reduce((sum, d) => sum + d.amount, 0) / recentDays.length
      : 0;
    
    const previousAvg = previousDays.length > 0
      ? previousDays.reduce((sum, d) => sum + d.amount, 0) / previousDays.length
      : 0;
    
    const velocityChange = previousAvg !== 0
      ? ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1)
      : null;

    // Find highest and lowest spending days
    const sortedDays = [...dailySpending].sort((a, b) => b.amount - a.amount);
    const highestDay = sortedDays[0];
    const lowestDay = sortedDays[sortedDays.length - 1];

    res.json({
      period: `${daysBack} days`,
      currency: targetCurrency,
      totalSpent,
      averageDaily,
      projectedMonthly,
      daysWithData,
      velocity: {
        recent7Days: recentAvg,
        previous7Days: previousAvg,
        change: velocityChange,
        trend: velocityChange > 10 ? 'increasing' : velocityChange < -10 ? 'decreasing' : 'stable'
      },
      extremes: {
        highest: highestDay ? {
          date: highestDay.date,
          amount: highestDay.amount
        } : null,
        lowest: lowestDay ? {
          date: lowestDay.date,
          amount: lowestDay.amount
        } : null
      },
      dailySpending: dailySpending.slice(0, 30) // Last 30 days
    });
  } catch (error) {
    console.error('Error calculating velocity:', error);
    res.status(500).json({ error: 'Failed to calculate spending velocity' });
  }
});

// Get spending patterns (weekday vs weekend, time of month)
router.get('/patterns', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '6', currency: displayCurrency } = req.query; // Default 6 months
    const monthsBack = parseInt(period);

    // Get user's default currency if not provided
    const userResult = await pool.query('SELECT currency FROM users WHERE id = $1', [userId]);
    const targetCurrency = displayCurrency || userResult.rows[0]?.currency || 'USD';

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const { rows } = await pool.query(
      `SELECT 
         transaction_date,
         amount,
         currency,
         EXTRACT(DOW FROM transaction_date) as day_of_week,
         EXTRACT(DAY FROM transaction_date) as day_of_month
       FROM transactions
       WHERE user_id = $1 
         AND type = 'expense'
         AND transaction_date >= $2`,
      [userId, startDate]
    );

    // Convert all amounts
    const transactions = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        convertedAmount: await convertCurrency(
          parseFloat(row.amount),
          row.currency,
          targetCurrency
        )
      }))
    );

    // Weekday vs Weekend analysis
    const weekdaySpending = [];
    const weekendSpending = [];
    
    transactions.forEach(t => {
      const dow = parseInt(t.day_of_week);
      if (dow === 0 || dow === 6) { // Sunday or Saturday
        weekendSpending.push(t.convertedAmount);
      } else {
        weekdaySpending.push(t.convertedAmount);
      }
    });

    const weekdayAvg = weekdaySpending.length > 0
      ? weekdaySpending.reduce((a, b) => a + b, 0) / weekdaySpending.length
      : 0;
    
    const weekendAvg = weekendSpending.length > 0
      ? weekendSpending.reduce((a, b) => a + b, 0) / weekendSpending.length
      : 0;

    // Day of month analysis (beginning, middle, end)
    const earlyMonth = []; // Days 1-10
    const midMonth = [];   // Days 11-20
    const lateMonth = [];  // Days 21-31
    
    transactions.forEach(t => {
      const day = parseInt(t.day_of_month);
      if (day <= 10) earlyMonth.push(t.convertedAmount);
      else if (day <= 20) midMonth.push(t.convertedAmount);
      else lateMonth.push(t.convertedAmount);
    });

    const calcAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    res.json({
      period: `${monthsBack} months`,
      currency: targetCurrency,
      totalTransactions: transactions.length,
      weekdayVsWeekend: {
        weekday: {
          count: weekdaySpending.length,
          average: weekdayAvg,
          total: weekdaySpending.reduce((a, b) => a + b, 0)
        },
        weekend: {
          count: weekendSpending.length,
          average: weekendAvg,
          total: weekendSpending.reduce((a, b) => a + b, 0)
        },
        difference: weekdayAvg !== 0 
          ? ((weekendAvg - weekdayAvg) / weekdayAvg * 100).toFixed(1)
          : null,
        pattern: weekendAvg > weekdayAvg * 1.2 ? 'weekend_spender' : 
                weekdayAvg > weekendAvg * 1.2 ? 'weekday_spender' : 'balanced'
      },
      monthlyPeriods: {
        earlyMonth: {
          days: '1-10',
          count: earlyMonth.length,
          average: calcAvg(earlyMonth),
          total: earlyMonth.reduce((a, b) => a + b, 0)
        },
        midMonth: {
          days: '11-20',
          count: midMonth.length,
          average: calcAvg(midMonth),
          total: midMonth.reduce((a, b) => a + b, 0)
        },
        lateMonth: {
          days: '21-31',
          count: lateMonth.length,
          average: calcAvg(lateMonth),
          total: lateMonth.reduce((a, b) => a + b, 0)
        },
        pattern: calcAvg(earlyMonth) > calcAvg(midMonth) && calcAvg(earlyMonth) > calcAvg(lateMonth)
          ? 'early_month_spender'
          : calcAvg(lateMonth) > calcAvg(earlyMonth) && calcAvg(lateMonth) > calcAvg(midMonth)
          ? 'late_month_spender'
          : 'distributed'
      }
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    res.status(500).json({ error: 'Failed to analyze spending patterns' });
  }
});

export default router;
