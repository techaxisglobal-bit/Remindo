const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

async function testAuth() {
    try {
        const authConfig = {
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
            credentials: {
              "account": "",
              "client_id": "REMOVED",
              "client_secret": "REMOVED",
              "quota_project_id": "ferrous-wonder-495407-b6",
              "refresh_token": "REMOVED",
              "type": "authorized_user",
              "universe_domain": "googleapis.com"
            }
        };

        const auth = new GoogleAuth(authConfig);
        const client = await auth.getClient();
        console.log("Getting access token...");
        const token = await client.getAccessToken();
        console.log("Token obtained successfully:", token.token.substring(0, 10) + "...");
        
        console.log("Testing FCM API...");
        const response = await axios.post(
            `https://fcm.googleapis.com/v1/projects/ferrous-wonder-495407-b6/messages:send`,
            { message: { token: "fake-token", notification: { title: "Test" } } },
            { headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' } }
        ).catch(e => e.response);
        
        console.log("FCM Response Status:", response.status);
        console.log("FCM Response Data:", response.data);
    } catch (e) {
        console.error("Auth failed:", e.message);
    }
}
testAuth();
