const express = require('express');
const router = express.Router();
const { TaskAttendee, Task } = require('../models');

// @route   GET api/attendees/respond
// @desc    Respond to an invitation (Public)
// @access  Public
router.get('/respond', async (req, res) => {
    const { taskId, email, status } = req.query;

    if (!taskId || !email || !status) {
        return res.status(400).send('Missing parameters');
    }

    if (!['Accepted', 'Declined'].includes(status)) {
        return res.status(400).send('Invalid status');
    }

    try {
        const attendee = await TaskAttendee.findOne({
            where: { taskId, email }
        });

        if (!attendee) {
            return res.status(404).send('Invitation not found');
        }

        attendee.status = status;
        await attendee.save();

        res.send(`
            <html>
            <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f4; margin: 0;">
                <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
                    <h2 style="color: ${status === 'Accepted' ? '#4CAF50' : '#f44336'};">Invitation ${status}</h2>
                    <p>You have successfully ${status.toLowerCase()} the invitation.</p>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
