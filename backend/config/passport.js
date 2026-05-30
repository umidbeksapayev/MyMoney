import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './database.js';
import bcrypt from 'bcrypt';

// Google OAuth Strategy - Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        // Check if user exists
        const userCheck = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (userCheck.rows.length > 0) {
          // User exists, return user
          return done(null, userCheck.rows[0]);
        } else {
          // Create new user
          const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
          const newUser = await pool.query(
            'INSERT INTO users (full_name, email, password, currency) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, email, randomPassword, 'USD']
          );
          
          // Create default categories for new user
          const defaultCategories = [
            { name: 'Salary', type: 'income' },
            { name: 'Food & Dining', type: 'expense' },
            { name: 'Transportation', type: 'expense' },
            { name: 'Shopping', type: 'expense' },
            { name: 'Entertainment', type: 'expense' }
          ];
          
          for (const cat of defaultCategories) {
            await pool.query(
              'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3)',
              [newUser.rows[0].id, cat.name, cat.type]
            );
          }
          
          return done(null, newUser.rows[0]);
        }
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  ));
  console.log('✅ Google OAuth Strategy initialized');
} else {
  console.log('⚠️  Google OAuth disabled - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not configured');
}

export default passport;

