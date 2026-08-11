const sequelize = require('./config/db');
const { Notification } = require('./models');

async function run() {
    try {
        await sequelize.authenticate();
        const notifs = await Notification.findAll({
            where: { userId: 70 }
        });
        console.log('Notifications for User 70:', JSON.stringify(notifs, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
