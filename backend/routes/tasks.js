const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Task, TaskAttendee } = require('../models');
const ActivityLog = require('../models/ActivityLog');
const { sendInvitation } = require('../services/emailService');
const User = require('../models/User');

const sanitizeNotifyBefore = (val) => {
    if (val === undefined || val === null) return '15';
    if (Array.isArray(val)) {
        return val.map(v => String(v).trim()).filter(Boolean).join(',');
    }
    return String(val).trim();
};


// @route   GET api/tasks
// @desc    Get all tasks for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [{ model: TaskAttendee, as: 'attendees' }]
        });
        res.json(tasks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', auth, async (req, res) => {
    const { title, description, category, date, time, duration, location, isAllDay, isSpecial, specialType, notifyAt, notifyBefore, completed, attendees } = req.body;

    try {
        const task = await Task.create({
            userId: req.user.id,
            title,
            description,
            category,
            date,
            time,
            duration,
            location,
            isAllDay,
            isSpecial,
            specialType,
            notifyAt,
            notifyBefore: sanitizeNotifyBefore(notifyBefore),
            completed,
        });

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_CREATED',
            details: { taskId: task.id, title: task.title },
            ipAddress: req.ip
        });

        if (attendees && Array.isArray(attendees) && attendees.length > 0) {
            const attendeeRecords = attendees.map(email => ({
                taskId: task.id,
                email,
                status: 'Pending'
            }));
            await TaskAttendee.bulkCreate(attendeeRecords);

            const user = await User.findByPk(req.user.id);
            const creatorName = user ? user.name : 'A Remindo User';
            const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

            for (const email of attendees) {
                sendInvitation(email, task, creatorName, backendUrl).catch(err => console.error('Error sending invitation in background:', err));
            }
        }

        const taskWithAttendees = await Task.findByPk(task.id, {
            include: [{ model: TaskAttendee, as: 'attendees' }]
        });

        res.json(taskWithAttendees);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tasks/:id/resend
// @desc    Resend invitation to an attendee
// @access  Private
router.post('/:id/resend', auth, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task || task.userId !== req.user.id) return res.status(404).json({ msg: 'Task not found' });

        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: 'Email is required' });

        const user = await User.findByPk(req.user.id);
        const creatorName = user ? user.name : 'A Remindo User';
        const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

        await sendInvitation(email, task, creatorName, backendUrl);
        res.json({ msg: 'Invitation resent' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { title, description, category, date, time, duration, location, isAllDay, isSpecial, specialType, notifyAt, notifyBefore, completed } = req.body;

    try {
        let task = await Task.findByPk(req.params.id);

        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Make sure user owns task
        if (task.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Check if date is changing - if so, create a new task instead of updating
        if (date !== undefined && date !== task.date) {
            const newTask = await Task.create({
                userId: req.user.id,
                title: title !== undefined ? title : task.title,
                description: description !== undefined ? description : task.description,
                category: category !== undefined ? category : task.category,
                date: date,
                time: time !== undefined ? time : task.time,
                duration: duration !== undefined ? duration : task.duration,
                location: location !== undefined ? location : task.location,
                isAllDay: isAllDay !== undefined ? isAllDay : task.isAllDay,
                isSpecial: isSpecial !== undefined ? isSpecial : task.isSpecial,
                specialType: specialType !== undefined ? specialType : task.specialType,
                notifyAt: notifyAt !== undefined ? notifyAt : task.notifyAt,
                notifyBefore: notifyBefore !== undefined ? sanitizeNotifyBefore(notifyBefore) : task.notifyBefore,
                completed: false, // New task should be fresh
            });

            await ActivityLog.create({
                userId: req.user.id,
                action: 'TASK_DUPLICATED',
                details: { originalTaskId: task.id, newTaskId: newTask.id, title: newTask.title },
                ipAddress: req.ip
            });

            return res.json(newTask);
        }

        // Update fields (normal update on same date)
        let notifyBeforeChanged = false;
        if (notifyBefore !== undefined) {
            const sanitized = sanitizeNotifyBefore(notifyBefore);
            if (sanitized !== task.notifyBefore) {
                task.notifyBefore = sanitized;
                notifyBeforeChanged = true;
            }
        }
        
        let timeChanged = false;
        if (time !== undefined && time !== task.time) {
            task.time = time;
            timeChanged = true;
            task.notifiedTime = false;
        }

        if (timeChanged || notifyBeforeChanged) {
            task.notifiedBeforeList = '';
        }

        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (category !== undefined) task.category = category;
        if (duration !== undefined) task.duration = duration;
        if (location !== undefined) task.location = location;
        if (isAllDay !== undefined) task.isAllDay = isAllDay;
        if (isSpecial !== undefined) task.isSpecial = isSpecial;
        if (specialType !== undefined) task.specialType = specialType;
        if (notifyAt !== undefined) task.notifyAt = notifyAt;
        if (completed !== undefined) task.completed = completed;

        await task.save();

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_UPDATED',
            details: { taskId: task.id, title: task.title },
            ipAddress: req.ip
        });

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let task = await Task.findByPk(req.params.id);

        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Make sure user owns task
        if (task.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const taskId = task.id;
        const taskTitle = task.title;
        await task.destroy();

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_DELETED',
            details: { taskId, title: taskTitle },
            ipAddress: req.ip
        });

        res.json({ msg: 'Task removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
