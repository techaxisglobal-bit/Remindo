const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded.user;
        
        // Check if user is admin
        const user = await User.findByPk(req.user.id);
        if (!user || user.email !== 'techaxisglobal@gmail.com') {
            return res.status(403).json({ msg: 'Access Denied: Admin only' });
        }
        
        req.adminUser = user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
