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

// @route   POST api/friends
// @desc    Add a friend manually
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ msg: 'Email is required' });
        }

        // Check if already exists
        let friend = await Friend.findOne({ where: { userId: req.user.id, email: email.toLowerCase() } });
        if (friend) {
            return res.status(400).json({ msg: 'Contact already exists' });
        }

        friend = await Friend.create({
            userId: req.user.id,
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            lastInvitedAt: new Date()
        });

        res.json(friend);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/friends/:id
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

module.exports = router;
