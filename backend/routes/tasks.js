const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

// @route   GET api/tasks
// @desc    Get all tasks for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
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
    const { title, description, category, date, time, duration, location, isAllDay, isSpecial, specialType, notifyAt, notifyBefore, completed } = req.body;

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
            notifyBefore,
            completed,
        });

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_CREATED',
            details: { taskId: task.id, title: task.title },
            ipAddress: req.ip
        });

        res.json(task);
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
                notifyBefore: notifyBefore !== undefined ? notifyBefore : task.notifyBefore,
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
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (category !== undefined) task.category = category;
        // date update is handled above by duplication, so we don't need to update it here
        // but for safety if it reaches here it means date was undefined or same
        if (time !== undefined) task.time = time;
        if (duration !== undefined) task.duration = duration;
        if (location !== undefined) task.location = location;
        if (isAllDay !== undefined) task.isAllDay = isAllDay;
        if (isSpecial !== undefined) task.isSpecial = isSpecial;
        if (specialType !== undefined) task.specialType = specialType;
        if (notifyAt !== undefined) task.notifyAt = notifyAt;
        if (notifyBefore !== undefined) task.notifyBefore = notifyBefore;
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
