require('dotenv').config();
const User = require('./models/User');
const { sendPushNotification } = require('./services/pushService');

async function testFCM() {
    const users = await User.findAll();
    let sentCount = 0;
    for (const user of users) {
        if (user.fcmToken) {
            console.log(`Sending to ${user.email} (FCM: ${user.fcmToken.substring(0, 15)}...)`);
            await sendPushNotification(user.fcmToken, { title: "Test", body: "Hello iOS" });
            sentCount++;
        }
    }
    if (sentCount === 0) console.log("No FCM tokens found in DB!");
    process.exit(0);
}
testFCM();
