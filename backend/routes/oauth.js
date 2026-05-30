import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Check if Google OAuth is configured
const isGoogleOAuthEnabled = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (isGoogleOAuthEnabled) {
  // Google OAuth - Initiate
  router.get('/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      session: false 
    })
  );

  // Google OAuth - Callback
  router.get('/google/callback',
    passport.authenticate('google', { 
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
    }),
    (req, res) => {
      try {
        // Create JWT token with userId and role
        const token = jwt.sign(
          { userId: req.user.id, id: req.user.id, email: req.user.email, role: req.user.role || 'user' },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Encode user data for URL
        const userData = encodeURIComponent(JSON.stringify({
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.full_name,
          role: req.user.role || 'user',
          oauth_provider: req.user.oauth_provider || 'google'
        }));

        // Redirect to frontend with token and user data
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
      } catch (error) {
        console.error('Error creating token:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=token_creation_failed`);
      }
    }
  );
} else {
  // Provide fallback routes when OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(503).json({ 
      error: 'Google OAuth is not configured on this server',
      message: 'Please use email/password authentication instead'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_not_configured`);
  });
}

export default router;

