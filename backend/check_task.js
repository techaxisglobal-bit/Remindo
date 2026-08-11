const sequelize = require('./config/db');
const { Task, User, TaskAttendee } = require('./models');

async function checkTask() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const tasks = await Task.findAll({
            where: { title: 'hasgdha' },
            include: [{ model: TaskAttendee, as: 'attendees' }]
        });
        
        console.log('Found Tasks:', JSON.stringify(tasks, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

checkTask();
