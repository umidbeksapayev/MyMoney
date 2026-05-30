import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  // Check if SendGrid is configured
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Using SendGrid for email delivery');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 2525, // Changed from 587 to 2525 to avoid firewall issues
      secure: false, // Use TLS
      auth: {
        user: 'apikey', // This is always 'apikey' for SendGrid
        pass: process.env.SENDGRID_API_KEY,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
    });
  }

  // Fallback to Gmail if configured
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('📧 Using Gmail for email delivery');
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  console.warn('⚠️  Email not configured - Set SENDGRID_API_KEY or EMAIL_USER/EMAIL_PASSWORD');
  return null;
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetUrl, userName = 'User') => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('📧 Email not configured - Reset URL logged to console instead');
    console.log('Reset URL:', resetUrl);
    return false;
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@auroraledger.com';

  const mailOptions = {
    from: {
      name: 'Aurora Ledger',
      address: fromEmail,
    },
    to: email,
    subject: 'Password Reset Request - Aurora Ledger',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(to right, #2563eb, #9333ea);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(to right, #2563eb, #9333ea);
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Aurora Ledger</div>
            <p style="color: #6b7280; margin-top: 8px;">Personal Finance Management</p>
          </div>

          <h2 style="color: #1f2937;">Password Reset Request</h2>
          
          <p>Hi ${userName},</p>
          
          <p>You recently requested to reset your password for your Aurora Ledger account. Click the button below to reset it:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Your Password</a>
          </div>
          
          <p>Or copy and paste this URL into your browser:</p>
          <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>

          <div class="warning">
            <strong>⚠️ Important:</strong> This link will expire in <strong>1 hour</strong> for security reasons.
          </div>

          <p style="margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>

          <div class="footer">
            <p>This email was sent from Aurora Ledger</p>
            <p>© ${new Date().getFullYear()} Aurora Ledger. All rights reserved.</p>
            <p style="margin-top: 10px;">
              <a href="${process.env.FRONTEND_URL}" style="color: #2563eb; text-decoration: none;">Visit Aurora Ledger</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${userName},

You recently requested to reset your password for your Aurora Ledger account.

Reset your password by clicking this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

---
Aurora Ledger
${process.env.FRONTEND_URL}
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully`);
    console.log(`   To: ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    if (error.response) {
      console.error(`   Response: ${error.response}`);
    }
    return false;
  }
};

// Send welcome email (optional)
export const sendWelcomeEmail = async (email, userName) => {
  const transporter = createTransporter();

  if (!transporter) {
    return false;
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@auroraledger.com';

  const mailOptions = {
    from: {
      name: 'Aurora Ledger',
      address: fromEmail,
    },
    to: email,
    subject: 'Welcome to Aurora Ledger! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(to right, #2563eb, #9333ea);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Aurora Ledger</div>
          <h2>Welcome aboard, ${userName}! 🎉</h2>
          <p>Thank you for joining Aurora Ledger. We're excited to help you manage your finances!</p>
          <p>Get started by:</p>
          <ul>
            <li>Adding your first transaction</li>
            <li>Setting up budgets for your expenses</li>
            <li>Customizing your categories</li>
            <li>Choosing your preferred currency (29+ supported!)</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #2563eb, #9333ea); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Go to Dashboard
            </a>
          </p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    return false;
  }
};

