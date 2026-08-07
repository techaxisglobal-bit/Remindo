const sequelize = require('./config/db');
const { Notification, User, Task } = require('./models');
const { createAppNotification } = require('./services/notificationService');

async function runTest() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const testUser = await User.findOne({ where: { email: 'sakethrapaka6@gmail.com' } });
        if (!testUser) {
            console.log('User not found');
            return;
        }

        const notification = await createAppNotification(null, {
            userId: testUser.id,
            senderId: testUser.id,
            type: 'Invitation',
            title: 'Test Notification',
            message: 'This is a test notification',
            relatedTaskId: null,
            actionUrl: '/invitation/test'
        });

        console.log('Created notification:', notification.toJSON());
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

runTest();
