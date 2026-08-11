const sequelize = require('./config/db');
const { Task, User, TaskAttendee } = require('./models');
const { createAppNotification } = require('./services/notificationService');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const task = await Task.findByPk(207);
        const existingUser = await User.findOne({ where: { email: 'sakethrapaka6@gmail.com' } });
        const creator = await User.findByPk(task.userId);
        
        console.log('Task found:', task.title);
        console.log('Existing User found:', existingUser.email);

        const notif = await createAppNotification(null, {
            userId: existingUser.id,
            senderId: creator.id,
            type: 'Invitation',
            title: 'Invitation Reminder',
            message: `${creator.name} sent you a reminder`,
            relatedTaskId: task.id,
            actionUrl: `/invitation/dummy-token`
        });
        
        console.log('Created Notification successfully:', notif.id);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}
run();
