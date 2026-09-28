const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const webpush = require('web-push');

const PROJECT_ID = 'ferrous-wonder-495407-b6';

// ----------------------------------------------------
// 1. Web Push VAPID Configuration (for browser)
// ----------------------------------------------------
const publicKey = process.env.VAPID_PUBLIC_KEY || 'BDap98w3jlmZUFtlSo9rvFaMxjIUnipFKkCTAdJaE_KI_MIYPQJlHPBuUwEtqNN8gS-kNNdpUaMPnAj4DXk8OsY';
const privateKey = process.env.VAPID_PRIVATE_KEY || '1m4eMk17aks5miggBZuk-oUsqMkcopTqXn3bVNtcEhc';

try {
    webpush.setVapidDetails(
        'mailto:example@yourdomain.org',
        publicKey,
        privateKey
    );
    console.log('Web Push VAPID details initialized successfully');
} catch (error) {
    console.error('Failed to initialize Web Push VAPID:', error.message);
}

// ----------------------------------------------------
// 2. Pure Google OAuth Token Generator (Application Default Credentials)
// ----------------------------------------------------
async function getAccessToken() {
    try {
        const authConfig = {
            scopes: ['https://www.googleapis.com/auth/firebase.messaging']
        };

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authConfig.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        }

        const auth = new GoogleAuth(authConfig);
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        return token.token;
    } catch (error) {
        console.error('Failed to retrieve Google OAuth access token. Make sure Application Default Credentials are set up.');
        throw error;
    }
}

// ----------------------------------------------------
// 3. Unified Dual Push Notification Sender
// ----------------------------------------------------
const sendPushNotification = async (target, payload) => {
    if (!target) return;

    if (typeof target === 'string') {
        // ----------------------------------------------------
        // Route 1: Mobile FCM V1 Push (via pure Google OAuth & axios)
        // ----------------------------------------------------
        try {
            const accessToken = await getAccessToken();
            
            const response = await axios.post(
                `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
                {
                    message: {
                        token: target,
                        notification: {
                            title: payload.title,
                            body: payload.body
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                sound: 'default',
                                channelId: 'remindo_alerts'
                            }
                        },
                        apns: {
                            payload: {
                                aps: {
                                    sound: 'default',
                                    badge: 1
                                }
                            }
                        },
                        data: payload.data ? Object.fromEntries(
                            Object.entries(payload.data).map(([k, v]) => [k, String(v)])
                        ) : {}
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Mobile FCM push sent successfully:', response.data);
        } catch (error) {
            console.error('Error sending Mobile FCM push notification:', error.response ? error.response.data : error.message);
        }
    } else if (typeof target === 'object') {
        // ----------------------------------------------------
        // Route 2: Web VAPID Push (via web-push)
        // ----------------------------------------------------
        try {
            await webpush.sendNotification(target, JSON.stringify(payload));
            console.log('Web VAPID push notification sent successfully');
        } catch (error) {
            console.error('Error sending Web VAPID push notification:', error.message, 'Status:', error.statusCode, 'Body:', error.body);
        }
    }
};

module.exports = { sendPushNotification };
