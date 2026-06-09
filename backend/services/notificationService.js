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

                // 1. Check for 'before' notifications (supports multiple comma-separated offsets)
                if (task.notifyBefore) {
                    const minutesList = String(task.notifyBefore)
                        .split(',')
                        .map(m => parseInt(m.trim(), 10))
                        .filter(m => !isNaN(m) && m > 0);

                    if (minutesList.length > 0) {
                        const taskDateTime = new Date(`${task.date}T${task.time}`);
                        const notifiedMinutesList = (task.notifiedBeforeList || '')
                            .split(',')
                            .map(m => parseInt(m.trim(), 10))
                            .filter(m => !isNaN(m));

                        let updated = false;

                        for (const minute of minutesList) {
                            if (!notifiedMinutesList.includes(minute)) {
                                const notifyDateTime = subMinutes(taskDateTime, minute);

                                if (isSameMinute(nowInUserTz, notifyDateTime)) {
                                    // Mark this minute as notified immediately
                                    notifiedMinutesList.push(minute);
                                    task.notifiedBeforeList = notifiedMinutesList.join(',');
                                    updated = true;

                                    const payload = {
                                        title: task.title,
                                        body: `Starting in ${minute} minutes`,
                                        icon: '/logo192.png'
                                    };
                                    
                                    if (task.user.fcmToken) {
                                        await sendPushNotification(task.user.fcmToken, payload);
                                    } else if (task.user.pushSubscription) {
                                        await sendPushNotification(task.user.pushSubscription, payload);
                                    }
                                }
                            }
                        }

                        if (updated) {
                            await task.save();
                        }
                    }
                }

                // 2. Check for task time notification
                if (!task.notifiedTime) {
                    const taskDateTime = new Date(`${task.date}T${task.time}`);

                    if (isSameMinute(nowInUserTz, taskDateTime)) {
                        // Mark as notified in database IMMEDIATELY to prevent race conditions!
                        task.notifiedTime = true;
                        await task.save();

                        const payload = {
                            title: task.title,
                            body: `This task is starting now!`,
                            icon: '/logo192.png'
                        };
                        
                        if (task.user.fcmToken) {
                            await sendPushNotification(task.user.fcmToken, payload);
                        } else if (task.user.pushSubscription) {
                            await sendPushNotification(task.user.pushSubscription, payload);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in notification scheduler:', error);
        }
    });
};

module.exports = { startNotificationScheduler };
