const cron = require('node-cron');
const { Task, User } = require('../models');
const { sendPushNotification } = require('./pushService');
const { Op } = require('sequelize');
const { format, addMinutes, subMinutes, parseISO, isSameMinute } = require('date-fns');

const startNotificationScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const currentTimeString = format(now, 'HH:mm');
        const currentDateString = format(now, 'yyyy-MM-dd');

        console.log(`Checking for notifications at ${currentDateString} ${currentTimeString}`);

        try {
            // Find all pending tasks with a time set
            const tasks = await Task.findAll({
                where: {
                    completed: false,
                    time: { [Op.ne]: '' }
                },
                include: [{ model: User, as: 'user' }]
            });

            for (const task of tasks) {
                if (!task.user || !task.user.notificationsEnabled) continue;
                if (!task.user.fcmToken && !task.user.pushSubscription) continue;

                // Resolve the user's specific local timezone
                const userTimezone = task.user.timezone || 'Asia/Kolkata';
                let nowInUserTz;
                try {
                    const localTimeString = new Date().toLocaleString('en-US', { timeZone: userTimezone });
                    nowInUserTz = new Date(localTimeString);
                } catch (e) {
                    console.error(`Invalid timezone "${userTimezone}" for user ${task.user.email}, falling back to UTC`, e.message);
                    const localTimeString = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
                    nowInUserTz = new Date(localTimeString);
                }

                // 1. Check for 'before' notification
                if (task.notifyBefore > 0 && !task.notifiedBefore) {
                    const taskDateTime = new Date(`${task.date}T${task.time}`);
                    const notifyDateTime = subMinutes(taskDateTime, task.notifyBefore);

                    if (isSameMinute(nowInUserTz, notifyDateTime)) {
                        const payload = {
                            title: 'Upcoming Task',
                            body: `${task.title} in ${task.notifyBefore} minutes`,
                            icon: '/logo192.png'
                        };
                        
                        if (task.user.fcmToken) {
                            await sendPushNotification(task.user.fcmToken, payload);
                        }
                        if (task.user.pushSubscription) {
                            await sendPushNotification(task.user.pushSubscription, payload);
                        }
                        
                        task.notifiedBefore = true;
                        await task.save();
                    }
                }

                // 2. Check for task time notification
                if (!task.notifiedTime) {
                    const taskDateTime = new Date(`${task.date}T${task.time}`);

                    if (isSameMinute(nowInUserTz, taskDateTime)) {
                        const payload = {
                            title: 'Task Reminder',
                            body: `Time for: ${task.title}`,
                            icon: '/logo192.png'
                        };
                        
                        if (task.user.fcmToken) {
                            await sendPushNotification(task.user.fcmToken, payload);
                        }
                        if (task.user.pushSubscription) {
                            await sendPushNotification(task.user.pushSubscription, payload);
                        }
                        
                        task.notifiedTime = true;
                        await task.save();
                    }
                }
            }
        } catch (error) {
            console.error('Error in notification scheduler:', error);
        }
    });
};

module.exports = { startNotificationScheduler };
