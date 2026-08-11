const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Group } = require('../models');

// @route   GET api/groups
// @desc    Get all groups for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const groups = await Group.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(groups);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/groups
// @desc    Create a new group
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, members } = req.body;
    if (!name) return res.status(400).json({ msg: 'Name is required' });

    try {
        const group = await Group.create({
            userId: req.user.id,
            name,
            members: members || []
        });
        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/groups/:id
// @desc    Update a group
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, members } = req.body;
    try {
        let group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (group.userId !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        if (name !== undefined) group.name = name;
        if (members !== undefined) group.members = members;

        await group.save();
        res.json(group);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/groups/:id
// @desc    Delete a group
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (group.userId !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        await group.destroy();
        res.json({ msg: 'Group removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
