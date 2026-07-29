const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using Gmail SMTP and App Password from environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a generic email
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Foody App'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('✉️ Email sent successfully! Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email Sending Failed:', error.message);
    throw error;
  }
};

/**
 * Sends a verification email with the token link
 * @param {string} toEmail - Recipient email address
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (toEmail, token) => {
  const verificationLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
  
  const subject = 'Verify Your Foody Account';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #ff4757; text-align: center;">Welcome to Foody! 🍔</h2>
      <p>Hello,</p>
      <p>Thank you for registering with Foody. Please click the button below to verify your email address and activate your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" style="background-color: #ff4757; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="color: #666; font-size: 12px;">Or copy and paste this link into your browser:</p>
      <p style="color: #0066cc; font-size: 12px; word-break: break-all;">${verificationLink}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 11px;">This link expires in 24 hours. If you did not create an account, please ignore this email.</p>
    </div>
  `;

  return await sendEmail({ to: toEmail, subject, html });
};

module.exports = {
  transporter,
  sendEmail,
  sendVerificationEmail,
};
