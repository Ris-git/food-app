require('dotenv').config();
const { sendEmail } = require('../services/email.service');

const testEmail = async () => {
  try {
    const recipient = process.env.TEST_EMAIL_RECIPIENT || process.env.EMAIL_USER;
    
    if (!recipient || (!process.env.RESEND_API_KEY && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS))) {
      console.error('❌ Missing email delivery configuration.');
      console.log('\nFor Render free, configure RESEND_API_KEY, EMAIL_FROM and TEST_EMAIL_RECIPIENT.');
      console.log('For local SMTP, configure EMAIL_USER and EMAIL_PASS.');
      process.exit(1);
    }

    console.log(`Sending test email through ${process.env.RESEND_API_KEY ? 'Resend HTTPS' : 'SMTP'} to ${recipient}...`);

    await sendEmail({
      to: recipient,
      subject: 'Foody App - Test Email Verification',
      html: `
        <h2>Test Email Successful! 🎉</h2>
        <p>If you are receiving this, your Nodemailer Gmail integration is configured correctly.</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `,
    });

    console.log('✅ Test email sent successfully! Check your inbox.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test email failed:', err.message);
    process.exit(1);
  }
};

testEmail();
