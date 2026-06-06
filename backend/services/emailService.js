const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send OTP to user's email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @param {string} type - Type of OTP ('signup' or 'reset')
 */
const sendOTP = async (email, otp, type = 'signup') => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('EMAIL_USER or EMAIL_PASS not set in .env. Falling back to console logging.');
        console.log(`\n\n=== OTP MOCK EMAIL ===\nTo: ${email}\nOTP: ${otp}\nType: ${type}\n======================\n\n`);
        return; // Don't throw error if not configured, just mock it
    }

    const subject = type === 'signup' ? 'Email Verification - Remindo' : 'Password Reset - Remindo';
    const message = type === 'signup'
        ? `Welcome to Remindo! Your verification code is: <b>${otp}</b>. It is valid for 10 minutes.`
        : `You requested a password reset. Your OTP is: <b>${otp}</b>. It is valid for 10 minutes.`;

    const mailOptions = {
        from: `"Remindo" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">Remindo</h2>
                <hr>
                <p>Hello,</p>
                <p>${message}</p>
                <p>If you did not request this, please ignore this email.</p>
                <br>
                <p>Best Regards,<br>The Remindo Team</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${email}. MessageId: ${info.messageId}`);
    } catch (error) {
        console.error('Error sending email via Nodemailer:', error);
        throw new Error('Could not send email. Please check your EMAIL_USER and EMAIL_PASS configuration.');
    }
};

module.exports = {
    sendOTP,
};
