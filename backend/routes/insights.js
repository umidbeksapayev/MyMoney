import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ==================== SMART CATEGORIZATION ====================

// Category keywords for automatic categorization
const categoryKeywords = {
  'Food & Dining': ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'lunch', 'dinner', 'breakfast', 'eat', 'dining', 'kitchen', 'bakery', 'grill', 'bistro', 'starbucks', 'mcdonald', 'kfc', 'grocery', 'supermarket', 'market'],
  'Transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus', 'train', 'flight', 'airline', 'car', 'vehicle', 'transport', 'grab', 'gojek', 'toll', 'petrol'],
  'Shopping': ['amazon', 'ebay', 'store', 'shop', 'mall', 'purchase', 'buy', 'clothes', 'fashion', 'shoes', 'electronics', 'gadget', 'zara', 'nike', 'adidas', 'uniqlo', 'h&m'],
  'Entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'ticket', 'show', 'theater', 'entertainment', 'youtube', 'steam', 'playstation', 'xbox'],
  'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medicine', 'clinic', 'dental', 'health', 'medical', 'drug', 'prescription', 'checkup', 'vaccination'],
  'Utilities': ['electric', 'water', 'internet', 'phone', 'utility', 'bill', 'wifi', 'mobile', 'broadband', 'cable', 'verizon', 'at&t'],
  'Housing': ['rent', 'mortgage', 'apartment', 'house', 'home', 'property', 'lease', 'landlord'],
  'Education': ['school', 'university', 'course', 'class', 'tuition', 'book', 'education', 'learning', 'udemy', 'coursera', 'study'],
  'Insurance': ['insurance', 'premium', 'policy', 'coverage', 'claim'],
  'Personal Care': ['salon', 'haircut', 'spa', 'gym', 'fitness', 'beauty', 'cosmetic', 'skincare', 'barber'],
  'Travel': ['hotel', 'airbnb', 'vacation', 'travel', 'trip', 'tour', 'booking', 'flight', 'resort'],
  'Subscriptions': ['subscription', 'membership', 'premium', 'pro', 'plus', 'netflix', 'spotify', 'youtube premium']
};

// Suggest category based on transaction description
router.get('/categorize', async (req, res) => {
  try {
    const { description } = req.query;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const lowerDesc = description.toLowerCase();
    const suggestions = [];

    // Score each category based on keyword matches
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of keywords) {
        if (lowerDesc.includes(keyword)) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        suggestions.push({
          category,
          score,
          confidence: score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low',
          matched_keywords: matchedKeywords
        });
      }
    }

    // Sort by score (highest first)
    suggestions.sort((a, b) => b.score - a.score);

    // Get user's actual categories
    const categoriesResult = await pool.query(
      'SELECT id, name FROM categories WHERE user_id = $1 OR user_id IS NULL',
      [req.user.id]
    );

    // Match suggestions with actual category IDs
    const matchedSuggestions = suggestions.map(sug => {
      const matchedCat = categoriesResult.rows.find(
        cat => cat.name.toLowerCase() === sug.category.toLowerCase()
      );
      return {
        ...sug,
        category_id: matchedCat?.id || null,
        category_name: matchedCat?.name || sug.category
      };
    }).filter(sug => sug.category_id !== null);

    res.json({
      description,
      suggestions: matchedSuggestions.slice(0, 3), // Top 3 suggestions
      total_matches: matchedSuggestions.length
    });
  } catch (error) {
    console.error('Categorization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Learn from user's past transactions to improve categorization
router.get('/learn-categories', async (req, res) => {
  try {
    // Get user's transaction patterns (description -> category mapping)
    const result = await pool.query(
      `SELECT 
         t.description,
         c.name as category_name,
         COUNT(*) as frequency
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
       GROUP BY t.description, c.name
       HAVING COUNT(*) >= 2
       ORDER BY frequency DESC
       LIMIT 50`,
      [req.user.id]
    );

    // Extract common words and their associated categories
    const patterns = result.rows.map(row => ({
      description: row.description,
      category: row.category_name,
      frequency: parseInt(row.frequency)
    }));

    res.json({
      patterns,
      total_patterns: patterns.length,
      message: 'These are your most frequent transaction patterns'
    });
  } catch (error) {
    console.error('Learn categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== SPENDING INSIGHTS ====================

router.get('/spending', async (req, res) => {
  try {
    const { period = '3months' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 3);
    }

    // Get user's preferred currency
    const userResult = await pool.query(
      'SELECT currency FROM users WHERE id = $1',
      [req.user.id]
    );
    const userCurrency = userResult.rows[0]?.currency || 'USD';

    // 1. Spending trends by category
    const categoryTrends = await pool.query(
      `SELECT 
         c.name as category,
         c.icon,
         c.color,
         COUNT(*) as transaction_count,
         SUM(CASE WHEN t.currency = $3 THEN t.amount ELSE 0 END) as total_spent,
         AVG(CASE WHEN t.currency = $3 THEN t.amount ELSE 0 END) as avg_transaction
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 
       AND t.type = 'expense'
       AND t.transaction_date >= $2
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total_spent DESC`,
      [req.user.id, startDate, userCurrency]
    );

    // 2. Day of week spending pattern
    const dayPattern = await pool.query(
      `SELECT 
         EXTRACT(DOW FROM transaction_date) as day_of_week,
         COUNT(*) as transaction_count,
         SUM(CASE WHEN currency = $3 THEN amount ELSE 0 END) as total_spent
       FROM transactions
       WHERE user_id = $1 
       AND type = 'expense'
       AND transaction_date >= $2
       GROUP BY EXTRACT(DOW FROM transaction_date)
       ORDER BY day_of_week`,
      [req.user.id, startDate, userCurrency]
    );

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daySpending = dayPattern.rows.map(row => ({
      day: dayNames[parseInt(row.day_of_week)],
      transaction_count: parseInt(row.transaction_count),
      total_spent: parseFloat(row.total_spent || 0)
    }));

    // 3. Monthly trend
    const monthlyTrend = await pool.query(
      `SELECT 
         TO_CHAR(transaction_date, 'YYYY-MM') as month,
         SUM(CASE WHEN type = 'income' AND currency = $3 THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN type = 'expense' AND currency = $3 THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE user_id = $1 
       AND transaction_date >= $2
       GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
       ORDER BY month`,
      [req.user.id, startDate, userCurrency]
    );

    const trends = monthlyTrend.rows.map(row => ({
      month: row.month,
      income: parseFloat(row.income || 0),
      expense: parseFloat(row.expense || 0),
      savings: parseFloat(row.income || 0) - parseFloat(row.expense || 0),
      savings_rate: parseFloat(row.income || 0) > 0 
        ? ((parseFloat(row.income || 0) - parseFloat(row.expense || 0)) / parseFloat(row.income || 0) * 100).toFixed(1)
        : 0
    }));

    // 4. Unusual spending detection (transactions > 2x average)
    const avgSpending = await pool.query(
      `SELECT AVG(amount) as avg_amount
       FROM transactions
       WHERE user_id = $1 
       AND type = 'expense'
       AND currency = $3
       AND transaction_date >= $2`,
      [req.user.id, startDate, userCurrency]
    );

    const avgAmount = parseFloat(avgSpending.rows[0]?.avg_amount || 0);
    const unusualThreshold = avgAmount * 2;

    const unusualTransactions = await pool.query(
      `SELECT 
         t.id,
         t.description,
         t.amount,
         t.currency,
         t.transaction_date,
         c.name as category
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 
       AND t.type = 'expense'
       AND t.currency = $3
       AND t.amount > $4
       AND t.transaction_date >= $2
       ORDER BY t.amount DESC
       LIMIT 5`,
      [req.user.id, startDate, userCurrency, unusualThreshold]
    );

    // 5. Generate insights
    const insights = [];

    // Top spending category
    if (categoryTrends.rows.length > 0) {
      const topCategory = categoryTrends.rows[0];
      insights.push({
        type: 'top_spending',
        title: 'Highest Spending Category',
        message: `You spent the most on ${topCategory.category} (${userCurrency} ${parseFloat(topCategory.total_spent).toFixed(2)})`,
        category: topCategory.category,
        amount: parseFloat(topCategory.total_spent)
      });
    }

    // Day with most spending
    const maxDaySpending = daySpending.reduce((max, day) => 
      day.total_spent > max.total_spent ? day : max
    , { day: '', total_spent: 0 });

    if (maxDaySpending.day) {
      insights.push({
        type: 'day_pattern',
        title: 'Peak Spending Day',
        message: `You tend to spend more on ${maxDaySpending.day}s`,
        day: maxDaySpending.day,
        amount: maxDaySpending.total_spent
      });
    }

    // Savings trend
    if (trends.length >= 2) {
      const latestMonth = trends[trends.length - 1];
      const previousMonth = trends[trends.length - 2];
      const savingsDiff = latestMonth.savings - previousMonth.savings;
      
      insights.push({
        type: 'savings_trend',
        title: savingsDiff >= 0 ? 'Savings Improved' : 'Savings Declined',
        message: savingsDiff >= 0 
          ? `Your savings increased by ${userCurrency} ${Math.abs(savingsDiff).toFixed(2)} from last month`
          : `Your savings decreased by ${userCurrency} ${Math.abs(savingsDiff).toFixed(2)} from last month`,
        change: savingsDiff,
        current_rate: latestMonth.savings_rate
      });
    }

    // Unusual spending alert
    if (unusualTransactions.rows.length > 0) {
      insights.push({
        type: 'unusual_spending',
        title: 'Unusual Transactions Detected',
        message: `Found ${unusualTransactions.rows.length} transactions significantly higher than your average`,
        transactions: unusualTransactions.rows.map(t => ({
          description: t.description,
          amount: parseFloat(t.amount),
          category: t.category,
          date: t.transaction_date
        }))
      });
    }

    res.json({
      period,
      date_range: {
        from: startDate.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0]
      },
      currency: userCurrency,
      insights,
      detailed_analysis: {
        category_trends: categoryTrends.rows.map(row => ({
          category: row.category,
          icon: row.icon,
          color: row.color,
          transaction_count: parseInt(row.transaction_count),
          total_spent: parseFloat(row.total_spent || 0),
          avg_transaction: parseFloat(row.avg_transaction || 0)
        })),
        day_of_week: daySpending,
        monthly_trends: trends,
        unusual_transactions: unusualTransactions.rows
      }
    });
  } catch (error) {
    console.error('Spending insights error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== BUDGET RECOMMENDATIONS ====================

router.get('/recommendations', async (req, res) => {
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

    // Get current budgets and spending
    const budgets = await pool.query(
      `SELECT 
         b.id,
         b.category_id,
         b.amount as budget_amount,
         c.name as category_name,
         COALESCE((SELECT SUM(amount) 
           FROM transactions t 
           WHERE t.user_id = $1 
           AND t.category_id = b.category_id 
           AND t.type = 'expense'
           AND t.currency = $4
           AND EXTRACT(MONTH FROM t.transaction_date) = $2
           AND EXTRACT(YEAR FROM t.transaction_date) = $3), 0) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3`,
      [req.user.id, month, year, userCurrency]
    );

    // Get 3-month average spending for categories without budgets
    const threeMonthsAgo = new Date(year, month - 4, 1); // 3 months before
    const targetMonth = new Date(year, month - 1, 1);

    const unbudgetedSpending = await pool.query(
      `SELECT 
         t.category_id,
         c.name as category_name,
         AVG(monthly.total) as avg_spent
       FROM (
         SELECT 
           category_id,
           TO_CHAR(transaction_date, 'YYYY-MM') as month,
           SUM(amount) as total
         FROM transactions
         WHERE user_id = $1
         AND type = 'expense'
         AND currency = $4
         AND transaction_date >= $2
         AND transaction_date < $3
         GROUP BY category_id, TO_CHAR(transaction_date, 'YYYY-MM')
       ) monthly
       JOIN transactions t ON t.category_id = monthly.category_id
       JOIN categories c ON c.id = t.category_id
       WHERE t.category_id NOT IN (
         SELECT category_id FROM budgets 
         WHERE user_id = $1 AND month = $5 AND year = $6
       )
       AND t.user_id = $1
       GROUP BY t.category_id, c.name
       HAVING AVG(monthly.total) > 0`,
      [req.user.id, threeMonthsAgo, targetMonth, userCurrency, month, year]
    );

    const recommendations = [];

    // Analyze existing budgets
    for (const budget of budgets.rows) {
      const budgetAmount = parseFloat(budget.budget_amount);
      const spent = parseFloat(budget.spent);
      const usagePercent = (spent / budgetAmount) * 100;

      if (usagePercent > 100) {
        // Over budget - suggest increase
        const suggestedIncrease = Math.ceil((spent - budgetAmount) * 1.1); // 10% buffer
        recommendations.push({
          type: 'increase',
          priority: 'high',
          category_id: budget.category_id,
          category: budget.category_name,
          current_budget: budgetAmount,
          suggested_budget: budgetAmount + suggestedIncrease,
          reason: `You exceeded this budget by ${(usagePercent - 100).toFixed(1)}%`,
          spent: spent,
          difference: suggestedIncrease
        });
      } else if (usagePercent < 50) {
        // Under budget significantly - suggest decrease
        const suggestedDecrease = Math.ceil((budgetAmount - spent) * 0.5);
        recommendations.push({
          type: 'decrease',
          priority: 'low',
          category_id: budget.category_id,
          category: budget.category_name,
          current_budget: budgetAmount,
          suggested_budget: Math.max(budgetAmount - suggestedDecrease, spent * 1.1),
          reason: `You only used ${usagePercent.toFixed(1)}% of this budget`,
          spent: spent,
          difference: -suggestedDecrease
        });
      } else if (usagePercent >= 90 && usagePercent <= 100) {
        // Nearly perfect - acknowledge
        recommendations.push({
          type: 'perfect',
          priority: 'info',
          category_id: budget.category_id,
          category: budget.category_name,
          current_budget: budgetAmount,
          suggested_budget: budgetAmount,
          reason: `Great job! You used ${usagePercent.toFixed(1)}% of your budget`,
          spent: spent,
          difference: 0
        });
      }
    }

    // Suggest budgets for categories without one
    for (const category of unbudgetedSpending.rows) {
      const avgSpent = parseFloat(category.avg_spent);
      const suggestedBudget = Math.ceil(avgSpent * 1.1); // 10% buffer

      recommendations.push({
        type: 'create',
        priority: 'medium',
        category_id: category.category_id,
        category: category.category_name,
        current_budget: 0,
        suggested_budget: suggestedBudget,
        reason: `Based on 3-month average spending of ${userCurrency} ${avgSpent.toFixed(2)}`,
        spent: 0,
        difference: suggestedBudget
      });
    }

    // Sort by priority
    const priorityOrder = { high: 1, medium: 2, low: 3, info: 4 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({
      month,
      year,
      currency: userCurrency,
      total_recommendations: recommendations.length,
      recommendations,
      summary: {
        increase: recommendations.filter(r => r.type === 'increase').length,
            decrease: recommendations.filter(r => r.type === 'decrease').length,
        create: recommendations.filter(r => r.type === 'create').length,
        perfect: recommendations.filter(r => r.type === 'perfect').length
      }
    });
  } catch (error) {
    console.error('Budget recommendations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
