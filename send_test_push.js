require('dotenv').config();
const User = require('./backend/models/User');
const { sendPushNotification } = require('./backend/services/pushService');

async function triggerDirectPush() {
    try {
        const user = await User.findOne({ where: { email: 'srihithab02@gmail.com' } });
        if (!user) {
            console.error('❌ User srihithab02@gmail.com not found in live Supabase database!');
            process.exit(1);
        }

        if (!user.pushSubscription) {
            console.error('❌ pushSubscription is NOT set for this user in Supabase!');
            process.exit(1);
        }

        console.log(`🎉 Found subscription in Supabase for ${user.name}!`);
        console.log('Sending instant push notification...');

        const payload = {
            title: 'Instant Remindo Test',
            body: 'Hello Srihitha! Your secure push system is working perfectly!',
            icon: '/logo192.png',
            data: { url: '/' }
        };

        await sendPushNotification(user.pushSubscription, payload);
        console.log('🎉 Push request successfully sent to Google push servers!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to trigger direct push:', error.message);
        process.exit(1);
    }
}

triggerDirectPush();
