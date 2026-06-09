const sequelize = require('../config/db');
const Task = require('../models/Task');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const taskDesc = await sequelize.getQueryInterface().describeTable('tasks');
        console.log('--- tasks Column Definitions ---');
        console.log('notifyBefore type:', taskDesc.notifyBefore ? taskDesc.notifyBefore.type : 'not found');
        console.log('notifiedBeforeList type:', taskDesc.notifiedBeforeList ? taskDesc.notifiedBeforeList.type : 'not found');

        // Find the latest task created
        const latestTask = await Task.findOne({
            order: [['createdAt', 'DESC']]
        });
        if (latestTask) {
            console.log('--- Latest Task ---');
            console.log('ID:', latestTask.id);
            console.log('Title:', latestTask.title);
            console.log('notifyBefore:', latestTask.notifyBefore);
            console.log('notifiedBeforeList:', latestTask.notifiedBeforeList);
            console.log('date:', latestTask.date);
            console.log('time:', latestTask.time);
        } else {
            console.log('No tasks found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
