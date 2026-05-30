import pool from '../config/database.js';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';

/**
 * Calculate next occurrence date based on frequency
 */
const calculateNextOccurrence = (currentDate, frequency) => {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    default:
      return date;
  }
};

/**
 * Process all due recurring transactions and create actual transactions
 */
export const processRecurringTransactions = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Processing recurring transactions...');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    await client.query('BEGIN');

    // Find all active recurring transactions that are due TODAY
    const recurringResult = await client.query(
      `SELECT * FROM recurring_transactions 
       WHERE is_active = true 
       AND next_occurrence = $1
       AND (end_date IS NULL OR end_date >= $1)
       ORDER BY next_occurrence ASC`,
      [today]
    );

    const dueRecurring = recurringResult.rows;
    console.log(`📊 Found ${dueRecurring.length} due recurring transactions`);

    let processedCount = 0;
    let errorCount = 0;

    for (const recurring of dueRecurring) {
      try {
        // Create the actual transaction
        await client.query(
          `INSERT INTO transactions 
           (user_id, type, amount, currency, transaction_date, category_id, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            recurring.user_id,
            recurring.type,
            recurring.amount,
            recurring.currency,
            recurring.next_occurrence,
            recurring.category_id,
            recurring.description ? `[Auto] ${recurring.description}` : '[Auto-generated from recurring]'
          ]
        );

        // Calculate next occurrence
        const nextOccurrence = calculateNextOccurrence(recurring.next_occurrence, recurring.frequency);
        const nextOccurrenceStr = format(nextOccurrence, 'yyyy-MM-dd');

        // Check if next occurrence is beyond end_date
        if (recurring.end_date && nextOccurrence > new Date(recurring.end_date)) {
          // Deactivate the recurring transaction
          await client.query(
            `UPDATE recurring_transactions 
             SET is_active = false, next_occurrence = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextOccurrenceStr, recurring.id]
          );
          console.log(`✅ Completed recurring #${recurring.id} (reached end date)`);
        } else {
          // Update next occurrence
          await client.query(
            `UPDATE recurring_transactions 
             SET next_occurrence = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextOccurrenceStr, recurring.id]
          );
          console.log(`✅ Processed recurring #${recurring.id}, next: ${nextOccurrenceStr}`);
        }

        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing recurring #${recurring.id}:`, error);
        errorCount++;
        // Continue with next recurring transaction
      }
    }

    await client.query('COMMIT');
    
    console.log(`🎉 Recurring processing complete: ${processedCount} processed, ${errorCount} errors`);
    return { processed: processedCount, errors: errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Recurring processing failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Manually trigger processing (useful for testing)
 */
export const triggerProcessing = async () => {
  try {
    return await processRecurringTransactions();
  } catch (error) {
    console.error('Failed to trigger recurring processing:', error);
    throw error;
  }
};

