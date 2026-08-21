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

module.exports = router;
