const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP to user's email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @param {string} type - Type of OTP ('signup' or 'reset')
 */
const sendOTP = async (email, otp, type = 'signup') => {
    const subject = type === 'signup' ? 'Email Verification - Remindo' : 'Password Reset - Remindo';
    const message = type === 'signup'
        ? `Welcome to Remindo! Your verification code is: <b>${otp}</b>. It is valid for 10 minutes.`
        : `You requested a password reset. Your OTP is: <b>${otp}</b>. It is valid for 10 minutes.`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Remindo <contact@techaxisglobal.com>',
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
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error(error.message);
        }

        console.log(`Email sent successfully to ${email}. ID: ${data.id}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Could not send email. Please check your Resend configuration.');
    }
};

module.exports = {
    sendOTP,
};
