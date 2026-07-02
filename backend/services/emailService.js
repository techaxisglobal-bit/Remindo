const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
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
        return; 
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
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${email}. ID: ${info.messageId}`);
    } catch (error) {
        console.error('Error sending email via Nodemailer:', error);
        throw new Error('Could not send email. Please check your email configuration.');
    }
};

const sendInvitation = async (email, task, creatorName, backendUrl) => {
    const acceptUrl = `${backendUrl}/api/attendees/respond?taskId=${task.id}&email=${encodeURIComponent(email)}&status=Accepted`;
    const declineUrl = `${backendUrl}/api/attendees/respond?taskId=${task.id}&email=${encodeURIComponent(email)}&status=Declined`;
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('EMAIL_USER or EMAIL_PASS not set in .env. Falling back to console logging for invitation.');
        console.log(`\n\n=== INVITATION MOCK EMAIL ===\nTo: ${email}\nTitle: ${task.title}\nCreator: ${creatorName}\nAccept: ${acceptUrl}\nDecline: ${declineUrl}\n======================\n\n`);
        return;
    }

    const mailOptions = {
        from: `"Remindo" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Invitation: ${task.title}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">You have been invited to a reminder!</h2>
                <hr>
                <p><strong>Creator:</strong> ${creatorName}</p>
                <p><strong>Title:</strong> ${task.title}</p>
                <p><strong>Date:</strong> ${task.date}</p>
                <p><strong>Time:</strong> ${task.time}</p>
                ${task.location ? `<p><strong>Location:</strong> ${task.location}</p>` : ''}
                ${task.description ? `<p><strong>Description:</strong><br/>${task.description.replace(/\\n/g, '<br/>')}</p>` : ''}
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="${acceptUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept</a>
                    <a href="${declineUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Decline</a>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Invitation sent successfully to ${email}. ID: ${info.messageId}`);
    } catch (error) {
        console.error('Error sending invitation via Nodemailer:', error);
    }
};

module.exports = {
    sendOTP,
    sendInvitation,
};
