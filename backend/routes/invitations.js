const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Task, TaskAttendee } = require('../models');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { Op } = require('sequelize');

// @route   GET api/invitations/:token
// @desc    Get invitation details by token (Public)
// @access  Public
router.get('/:token', async (req, res) => {
    try {
        const attendee = await TaskAttendee.findOne({
            where: { token: req.params.token },
            include: [{ model: Task, as: 'task' }] // Wait, is the association set up? I'll need to check or just do separate queries
        });

        if (!attendee) {
            return res.status(404).json({ msg: 'Invitation not found or invalid token' });
        }

        // Fetch task since include might not be set up exactly like that
        const task = await Task.findByPk(attendee.taskId);
        if (!task) {
            return res.status(404).json({ msg: 'Original reminder no longer exists' });
        }

        const creator = await User.findByPk(task.userId);
        const creatorName = creator ? creator.name : 'A Remindo User';

        res.json({
            id: attendee.id,
            email: attendee.email,
            status: attendee.status,
            expiresAt: attendee.expiresAt,
            task: {
                id: task.id,
                title: task.title,
                date: task.date,
                time: task.time,
                creatorName: creatorName
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/invitations/respond
// @desc    Respond to an invitation (Accept/Decline)
// @access  Private
router.post('/respond', auth, async (req, res) => {
    const { token, action } = req.body;

    if (!token || !action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({ msg: 'Invalid parameters' });
    }

    try {
        // Get the logged in user
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const sequelize = require('../config/db');

        const result = await sequelize.transaction(async (t) => {
            const attendee = await TaskAttendee.findOne({
                where: { token },
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!attendee) {
                return { status: 404, data: { msg: 'Invitation not found' } };
            }

            // Check if token expired
            if (attendee.expiresAt && new Date() > new Date(attendee.expiresAt)) {
                return { status: 400, data: { msg: 'Invitation has expired' } };
            }

            // Verify the authenticated user's email matches the invited email
            if (user.email.toLowerCase() !== attendee.email.toLowerCase()) {
                return { status: 403, data: { msg: 'This invitation is not for your account' } };
            }

            if (action === 'decline') {
                if (attendee.status === 'Declined') {
                    return { status: 400, data: { msg: 'Invitation already declined', attendee } };
                }
                attendee.status = 'Declined';
                await attendee.save({ transaction: t });
                return { status: 200, data: { msg: 'Invitation declined', attendee } };
            }

            // Accept flow
            if (attendee.status === 'Accepted') {
                return { status: 400, data: { msg: 'Invitation already accepted' } };
            }

            const originalTask = await Task.findByPk(attendee.taskId, { transaction: t });
            if (!originalTask) {
                return { status: 404, data: { msg: 'Original reminder no longer exists' } };
            }

            // Also check if user already has a reminder created from this invitation (safety net)
            // It could be that the task was cloned but attendee status update failed (unlikely in tx, but good for idempotent APIs)
            if (attendee.sharedTaskId) {
                 const existingSharedTask = await Task.findByPk(attendee.sharedTaskId, { transaction: t });
                 if (existingSharedTask) {
                     return { status: 400, data: { msg: 'Invitation already accepted' } };
                 }
            }

            const originalOwner = await User.findByPk(originalTask.userId, { transaction: t });
            const originalOwnerName = originalOwner ? originalOwner.name : 'Unknown User';

            // Clone the task for the current user
            const clonedTask = await Task.create({
                userId: user.id,
                title: originalTask.title,
                description: originalTask.description,
                category: originalTask.category,
                date: originalTask.date,
                time: originalTask.time,
                duration: originalTask.duration,
                location: originalTask.location,
                isAllDay: originalTask.isAllDay,
                isSpecial: originalTask.isSpecial,
                specialType: originalTask.specialType,
                notifyAt: originalTask.notifyAt,
                notifyBefore: originalTask.notifyBefore,
                completed: false,
                isShared: true,
                sharedBy: originalOwnerName,
                originalTaskId: originalTask.id
            }, { transaction: t });

            // Update attendee status
            attendee.status = 'Accepted';
            attendee.acceptedAt = new Date();
            attendee.sharedTaskId = clonedTask.id;
            await attendee.save({ transaction: t });

            await ActivityLog.create({
                userId: user.id,
                action: 'INVITATION_ACCEPTED',
                details: { originalTaskId: originalTask.id, clonedTaskId: clonedTask.id, title: clonedTask.title },
                ipAddress: req.ip
            }, { transaction: t });

            return { status: 200, data: { msg: 'Invitation accepted and reminder added', task: clonedTask, attendee } };
        });

        return res.status(result.status).json(result.data);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/invitations/:id
// @desc    Cancel/delete an invitation (by task owner)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const attendee = await TaskAttendee.findByPk(req.params.id);
        if (!attendee) return res.status(404).json({ msg: 'Invitation not found' });

        const task = await Task.findByPk(attendee.taskId);
        if (!task || task.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // If it was already accepted, we might want to also delete the cloned task, but for now just mark cancelled or delete the record.
        // We'll just delete the attendee record to revoke access.
        if (attendee.status === 'Accepted' && attendee.sharedTaskId) {
            const sharedTask = await Task.findByPk(attendee.sharedTaskId);
            if (sharedTask) {
                await sharedTask.destroy();
            }
        }

        await attendee.destroy();
        res.json({ msg: 'Invitation cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
