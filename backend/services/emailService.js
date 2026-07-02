const axios = require('axios');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'Remindo <noreply@remaindo.com>';

/**
 * Helper to get Microsoft Graph Access Token
 */
async function getMsGraphToken() {
    const tenantId = process.env.MICROSOFT_GRAPH_TENANT_ID;
    const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;
    
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const res = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data.access_token;
}

/**
 * Helper to send email via either MS Graph, Resend, or Console
 */
async function sendEmail(to, subject, htmlContent) {
    // 1. Try Microsoft Graph API (HTTPS - Bypasses SMTP blocks)
    if (process.env.MICROSOFT_GRAPH_CLIENT_ID && process.env.MICROSOFT_GRAPH_CLIENT_SECRET) {
        try {
            const token = await getMsGraphToken();
            const sender = process.env.MICROSOFT_GRAPH_SENDER;

            const messagePayload = {
                message: {
                    subject: subject,
                    body: { contentType: 'HTML', content: htmlContent },
                    toRecipients: [{ emailAddress: { address: to } }]
                },
                saveToSentItems: 'false'
            };

            await axios.post(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, messagePayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`Email sent successfully via MS Graph to ${to}.`);
            return;
        } catch (error) {
            console.error('MS Graph email failed:', error.response?.data || error.message);
            throw new Error('Could not send email via Microsoft Graph.');
        }
    }

    // 2. Fallback to Resend
    if (resend) {
        try {
            const data = await resend.emails.send({
                from: FROM_EMAIL,
                to: to,
                subject: subject,
                html: htmlContent
            });
            if (data.error) throw new Error(data.error.message);
            console.log(`Email sent successfully via Resend to ${to}.`);
            return;
        } catch (error) {
            console.error('Resend email failed:', error.message);
            throw new Error('Could not send email via Resend.');
        }
    }

    // 3. Fallback to Console (for local dev without keys)
    console.warn('No Email APIs configured. Mocking email to console.');
    console.log(`\n\n=== MOCK EMAIL ===\nTo: ${to}\nSubject: ${subject}\nBody: ${htmlContent.substring(0, 100)}...\n======================\n\n`);
}

/**
 * Send OTP to user's email
 */
const sendOTP = async (email, otp, type = 'signup') => {
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

    await sendEmail(email, subject, htmlContent);
};

const sendInvitation = async (email, task, creatorName, backendUrl) => {
    const acceptUrl = `${backendUrl}/api/attendees/respond?taskId=${task.id}&email=${encodeURIComponent(email)}&status=Accepted`;
    const declineUrl = `${backendUrl}/api/attendees/respond?taskId=${task.id}&email=${encodeURIComponent(email)}&status=Declined`;
    
    const subject = `Invitation: ${task.title}`;
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
        await sendEmail(email, subject, htmlContent);
    } catch (err) {
        console.error('Error sending invitation:', err.message);
    }
};

module.exports = {
    sendOTP,
    sendInvitation,
};
