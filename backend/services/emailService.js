const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Helper to get Microsoft Graph API access token
 */
async function getGraphToken() {
    const tenantId = process.env.MICROSOFT_GRAPH_TENANT_ID;
    const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Missing Microsoft Graph API credentials in environment variables.');
    }

    const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials'
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return tokenResponse.data.access_token;
}

/**
 * Send OTP to user's email
 * @param {string} email - Recipient email
 * @param {string} otp - The OTP code
 * @param {string} type - Type of OTP ('signup' or 'reset')
 */
const sendOTP = async (email, otp, type = 'signup') => {
    if (!process.env.MICROSOFT_GRAPH_CLIENT_ID) {
        console.warn('MICROSOFT_GRAPH_CLIENT_ID not set. Falling back to console logging.');
        console.log(`\n\n=== OTP MOCK EMAIL ===\nTo: ${email}\nOTP: ${otp}\nType: ${type}\n======================\n\n`);
        return; 
    }

    const subject = type === 'signup' ? 'Email Verification - Remindo' : 'Password Reset - Remindo';
    const message = type === 'signup'
        ? `Welcome to Remindo! Your verification code is: <b>${otp}</b>. It is valid for 10 minutes.`
        : `You requested a password reset. Your OTP is: <b>${otp}</b>. It is valid for 10 minutes.`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4A90E2; text-align: center;">Remindo</h2>
            <hr>
            <p>Hello,</p>
            <p>${message}</p>
            <p>If you did not request this, please ignore this email.</p>
            <br>
            <p>Best Regards,<br>The Remindo Team</p>
        </div>
    `;

    try {
        const token = await getGraphToken();
        const sender = process.env.MICROSOFT_GRAPH_SENDER || 'contact@techaxisglobal.com';

        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
            {
                message: {
                    subject: subject,
                    body: { contentType: "HTML", content: htmlContent },
                    toRecipients: [{ emailAddress: { address: email } }]
                },
                saveToSentItems: "false"
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`Email sent successfully to ${email} via Microsoft Graph API.`);
    } catch (error) {
        console.error('Error sending email via Microsoft Graph API:', error.response ? JSON.stringify(error.response.data) : error.message);
        throw new Error('Could not send email. Please check your email configuration.');
    }
};

const sendInvitation = async (email, task, creatorName, frontendUrl, token) => {
    // Generate secure links to frontend
    const acceptUrl = `${frontendUrl}/invite?token=${token}&action=accept`;
    const declineUrl = `${frontendUrl}/invite?token=${token}&action=decline`;
    
    if (!process.env.MICROSOFT_GRAPH_CLIENT_ID) {
        console.warn('MICROSOFT_GRAPH_CLIENT_ID not set. Falling back to console logging for invitation.');
        console.log(`\n\n=== INVITATION MOCK EMAIL ===\nTo: ${email}\nTitle: ${task.title}\nCreator: ${creatorName}\nToken: ${token}\nAccept: ${acceptUrl}\nDecline: ${declineUrl}\n======================\n\n`);
        return;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4A90E2; text-align: center;">You have been invited to a reminder!</h2>
            <hr>
            <p><strong>Creator:</strong> ${creatorName}</p>
            <p><strong>Title:</strong> ${task.title}</p>
            <p><strong>Date:</strong> ${task.date}</p>
            <p><strong>Time:</strong> ${task.time}</p>
            ${task.location ? `<p><strong>Location:</strong> ${task.location}</p>` : ''}
            ${task.description ? `<p><strong>Description:</strong><br/>${task.description.replace(/\n/g, '<br/>')}</p>` : ''}
            
            <div style="margin-top: 30px; text-align: center;">
                <a href="${acceptUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept</a>
                <a href="${declineUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Decline</a>
            </div>
        </div>
    `;

    try {
        const token = await getGraphToken();
        const sender = process.env.MICROSOFT_GRAPH_SENDER || 'contact@techaxisglobal.com';

        await axios.post(
            `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
            {
                message: {
                    subject: `Invitation: ${task.title}`,
                    body: { contentType: "HTML", content: htmlContent },
                    toRecipients: [{ emailAddress: { address: email } }]
                },
                saveToSentItems: "false"
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`Invitation sent successfully to ${email} via Microsoft Graph API.`);
    } catch (error) {
        console.error('Error sending invitation via Microsoft Graph API:', error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

module.exports = {
    sendOTP,
    sendInvitation,
};
