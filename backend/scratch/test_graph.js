const axios = require('axios');

async function testGraph() {
    const tenantId = '58f9dc46-e322-464e-b871-faa8e615a692';
    const clientId = '28dab411-70e5-4b17-a9b3-015a2a252add';
    const clientSecret = 'REDACTED';
    const sender = 'contact@techaxisglobal.com';
    const toEmail = 'sakethrapaka6@gmail.com'; // or another email

    try {
        console.log('Getting token...');
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

        const token = tokenResponse.data.access_token;
        console.log('Got token! Sending email...');

        const emailResponse = await axios.post(
            `https://graph.microsoft.com/v1.0/users/${sender}/sendMail`,
            {
                message: {
                    subject: "Test from Graph API",
                    body: {
                        contentType: "HTML",
                        content: "<h1>Hello!</h1><p>This is a test email from the Microsoft Graph API.</p>"
                    },
                    toRecipients: [
                        { emailAddress: { address: toEmail } }
                    ]
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

        console.log('Email sent successfully! Status:', emailResponse.status);
    } catch (err) {
        console.error('Error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}

testGraph();
