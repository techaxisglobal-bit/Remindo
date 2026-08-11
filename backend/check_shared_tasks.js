const sequelize = require('./config/db');
const { Task, TaskAttendee } = require('./models');

async function run() {
    try {
        await sequelize.authenticate();
        const tasks = await Task.findAll({
            where: { originalTaskId: 207 }
        });
        console.log('Shared Tasks:', JSON.stringify(tasks, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
