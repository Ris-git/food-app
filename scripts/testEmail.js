require('dotenv').config();
const { sendEmail } = require('../services/email.service');

const testEmail = async () => {
  try {
    const recipient = process.env.TEST_EMAIL_RECIPIENT || process.env.EMAIL_USER;
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Missing EMAIL_USER or EMAIL_PASS in food-app/.env file!');
      console.log('\nPlease add your Gmail credentials to food-app/.env:');
      console.log('  EMAIL_USER=your_email@gmail.com');
      console.log('  EMAIL_PASS=xxxx xxxx xxxx xxxx  (16-digit Gmail App Password)');
      process.exit(1);
    }

    console.log(`Sending test email from ${process.env.EMAIL_USER} to ${recipient}...`);

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
