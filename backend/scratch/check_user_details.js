const sequelize = require('../config/db');
const Task = require('../models/Task');
const User = require('../models/User');

async function check() {
    try {
        await sequelize.authenticate();
        
        const latestTask = await Task.findOne({
            order: [['createdAt', 'DESC']]
        });
        
        if (latestTask) {
            console.log('--- Task details ---');
            console.log('ID:', latestTask.id);
            console.log('Title:', latestTask.title);
            console.log('userId:', latestTask.userId);
            
            const user = await User.findByPk(latestTask.userId);
            if (user) {
                console.log('--- User details ---');
                console.log('ID:', user.id);
                console.log('Email:', user.email);
                console.log('notificationsEnabled:', user.notificationsEnabled);
                console.log('fcmToken:', user.fcmToken ? 'Present' : 'Not set');
                console.log('pushSubscription:', user.pushSubscription ? 'Present' : 'Not set');
            } else {
                console.log('User not found in database');
            }
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
