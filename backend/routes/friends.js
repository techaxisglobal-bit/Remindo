const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Friend } = require('../models');
const { Op } = require('sequelize');

// @route   GET api/friends
// @desc    Get all saved friends for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const query = req.query.query;
        let whereClause = { userId: req.user.id };

        if (query) {
            whereClause = {
                ...whereClause,
                [Op.or]: [
                    { email: { [Op.iLike]: `%${query}%` } },
                    { name: { [Op.iLike]: `%${query}%` } }
                ]
            };
        }

        const friends = await Friend.findAll({
            where: whereClause,
            order: [['lastInvitedAt', 'DESC']],
            limit: 50 // Limit to top 50 recent friends for performance
        });

        res.json(friends);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/friends/requests
// @desc    Get all incoming pending friend requests
// @access  Private
router.get('/requests', auth, async (req, res) => {
    try {
        const requests = await Friend.findAll({
            where: {
                contactUserId: req.user.id,
                status: 'pending'
            },
            order: [['createdAt', 'DESC']]
        });
        
        // We need the sender's details.
        const { User } = require('../models');
        
        const enrichedRequests = await Promise.all(requests.map(async (reqRow) => {
            const sender = await User.findByPk(reqRow.userId, {
                attributes: ['id', 'name', 'email']
            });
            
            return {
                id: reqRow.id,
                senderId: sender ? sender.id : null,
                senderName: sender ? sender.name : 'Unknown User',
                senderEmail: sender ? sender.email : 'Unknown Email',
                token: reqRow.token // For accepting/declining
            };
        }));
        
        res.json(enrichedRequests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/friends
// @desc    Add a friend manually / Send friend request
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ msg: 'Email is required' });
        }
        
        const cleanEmail = email.toLowerCase().trim();

        // Prevent self-invite
        const senderUser = await require('../models/User').findByPk(req.user.id);
        if (cleanEmail === senderUser.email.toLowerCase()) {
            return res.status(400).json({ msg: 'You cannot invite yourself' });
        }

        // Check if already friends
        let friend = await Friend.findOne({ where: { userId: req.user.id, email: cleanEmail } });
        if (friend && friend.status === 'accepted') {
            return res.status(400).json({ msg: 'Already in your friends' });
        }

        const FriendRequest = require('../models/FriendRequest');
        // Check if pending request exists
        const existingReq = await FriendRequest.findOne({
            where: { senderId: req.user.id, recipientEmail: cleanEmail, status: 'pending' }
        });
        if (existingReq) {
            // Check cooldown (e.g., 24 hours)
            if (existingReq.createdAt && new Date() - existingReq.createdAt < 24 * 60 * 60 * 1000) {
                return res.status(400).json({ msg: 'An invitation is already pending. Please wait 24h to resend.' });
            }
            // If cooldown passed, we could update it, but let's just proceed to send again
            existingReq.createdAt = new Date();
            await existingReq.save();
        }

        // Generate token
        const crypto = require('crypto');
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        
        // Expiry 7 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Check if user exists
        const recipientUser = await require('../models/User').findOne({ where: { email: cleanEmail } });

        let reqRecord = existingReq;
        if (!reqRecord) {
            reqRecord = await FriendRequest.create({
                senderId: req.user.id,
                recipientUserId: recipientUser ? recipientUser.id : null,
                recipientEmail: cleanEmail,
                status: 'pending',
                tokenHash,
                expiresAt
            });
        }

        // Create or update Friend record for the sender
        if (!friend) {
            friend = await Friend.create({
                userId: req.user.id,
                contactUserId: recipientUser ? recipientUser.id : null,
                email: cleanEmail,
                name: name || cleanEmail.split('@')[0],
                status: 'pending',
                lastInvitedAt: new Date()
            });
        } else {
            friend.status = 'pending';
            friend.lastInvitedAt = new Date();
            await friend.save();
        }

        if (recipientUser) {
            // In-app notification
            const { createAppNotification } = require('../services/notificationService');
            await createAppNotification(req.app.get('io'), {
                userId: recipientUser.id,
                senderId: req.user.id,
                type: 'FriendRequest',
                title: 'New Friend Request',
                message: `${senderUser.name || 'A user'} sent you a friend request.`,
                actionUrl: `/friend-requests?token=${rawToken}` // Send raw token in action url
            });
        }
        
        // ALWAYS send email invitation, regardless of whether they have an account
        const { sendFriendRequest } = require('../services/emailService');
        const frontendUrl = process.env.FRONTEND_URL || 'https://web.remaindo.com';
        await sendFriendRequest(cleanEmail, senderUser.name || senderUser.email, frontendUrl, rawToken);

        res.json({ msg: 'Invitation sent', friend });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/friends/respond
// @desc    Respond to a friend request
// @access  Private
router.post('/respond', auth, async (req, res) => {
    const { token, requestId, action } = req.body; // action: 'accept' | 'decline'

    if ((!token && !requestId) || !action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({ msg: 'Invalid parameters' });
    }

    try {
        const FriendRequest = require('../models/FriendRequest');
        const User = require('../models/User');
        const Friend = require('../models/Friend');
        const sequelize = require('../config/db');

        // Verify user exists
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const result = await sequelize.transaction(async (t) => {
            let reqRecord;
            
            if (token) {
                const crypto = require('crypto');
                const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                reqRecord = await FriendRequest.findOne({
                    where: { tokenHash },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });
            } else if (requestId) {
                const friendRow = await Friend.findByPk(requestId, { transaction: t });
                if (!friendRow) return { status: 404, data: { msg: 'Friend request not found' } };
                
                reqRecord = await FriendRequest.findOne({
                    where: { senderId: friendRow.userId, recipientEmail: user.email },
                    order: [['createdAt', 'DESC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });
            }

            if (!reqRecord) {
                return { status: 404, data: { msg: 'Invitation not found' } };
            }

            if (reqRecord.expiresAt && new Date() > new Date(reqRecord.expiresAt)) {
                return { status: 400, data: { msg: 'Invitation has expired' } };
            }

            if (user.email.toLowerCase() !== reqRecord.recipientEmail.toLowerCase()) {
                return { status: 403, data: { msg: 'This invitation is not for your account' } };
            }

            if (action === 'decline') {
                if (reqRecord.status === 'declined') {
                    return { status: 400, data: { msg: 'Invitation already declined' } };
                }
                reqRecord.status = 'declined';
                reqRecord.respondedAt = new Date();
                await reqRecord.save({ transaction: t });

                // Also update the sender's local Friend record status if it exists
                const Friend = require('../models/Friend');
                await Friend.update(
                    { status: 'declined' },
                    { where: { userId: reqRecord.senderId, email: reqRecord.recipientEmail }, transaction: t }
                );

                return { status: 200, data: { msg: 'Invitation declined' } };
            }

            // Accept flow
            if (reqRecord.status === 'accepted') {
                return { status: 400, data: { msg: 'Invitation already accepted' } };
            }

            reqRecord.status = 'accepted';
            reqRecord.respondedAt = new Date();
            await reqRecord.save({ transaction: t });

            const Friend = require('../models/Friend');
            
            // Update sender's local Friend record
            await Friend.update(
                { status: 'accepted', contactUserId: user.id, name: user.name },
                { where: { userId: reqRecord.senderId, email: reqRecord.recipientEmail }, transaction: t }
            );

            // Create mutual friend record for recipient
            const senderUser = await User.findByPk(reqRecord.senderId, { transaction: t });
            if (senderUser) {
                await Friend.findOrCreate({
                    where: { userId: user.id, email: senderUser.email },
                    defaults: {
                        contactUserId: senderUser.id,
                        name: senderUser.name,
                        status: 'accepted'
                    },
                    transaction: t
                });

                // Notify sender
                const { createAppNotification } = require('../services/notificationService');
                await createAppNotification(req.app.get('io'), {
                    userId: senderUser.id,
                    senderId: user.id,
                    type: 'FriendAccepted',
                    title: 'Friend Request Accepted',
                    message: `${user.name} accepted your friend request!`,
                    actionUrl: '/friends'
                }).catch(err => console.error('Failed to send accept notification', err));
            }

            return { status: 200, data: { msg: 'Invitation accepted' } };
        });

        return res.status(result.status).json(result.data);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// @desc    Remove a friend
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const friend = await Friend.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!friend) {
            return res.status(404).json({ msg: 'Contact not found' });
        }

        await friend.destroy();
        res.json({ msg: 'Contact removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/friends/:id
// @desc    Update a friend
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ msg: 'Email is required' });
        }

        const friend = await Friend.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!friend) {
            return res.status(404).json({ msg: 'Contact not found' });
        }

        // Check if the new email already exists for another friend of this user
        const existingFriend = await Friend.findOne({ where: { userId: req.user.id, email: email.toLowerCase() } });
        if (existingFriend && existingFriend.id !== friend.id) {
            return res.status(400).json({ msg: 'Contact with this email already exists' });
        }

        friend.email = email.toLowerCase();
        await friend.save();

        res.json(friend);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
