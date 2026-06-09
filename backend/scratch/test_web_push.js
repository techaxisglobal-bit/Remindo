const User = require('../models/User');
const { sendPushNotification } = require('./pushService');

async function test() {
  try {
    const user = await User.findByPk(28);
    if (!user) {
      console.error('User with id 28 not found');
      return;
    }
    const subscription = user.pushSubscription;
    if (!subscription) {
      console.error('User does not have a pushSubscription');
      return;
    }
    const payload = {
      title: 'Test Web Push',
      body: 'This is a test notification from Remindo.',
      data: {}
    };
    await sendPushNotification(subscription, payload);
    console.log('Test web push sent (if no error above)');
  } catch (err) {
    console.error('Error in test_web_push script:', err);
  }
}

test();
