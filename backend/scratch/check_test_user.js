const sequelize = require('../config/db');
const User = require('../models/User');
const { Op } = require('sequelize');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        const testUsers = await User.findAll({
            where: {
                email: {
                    [Op.like]: 'test_%'
                }
            },
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        console.log('Recent test users in DB:');
        testUsers.forEach(u => {
            console.log(`- ID: ${u.id}, Email: ${u.email}, CreatedAt: ${u.createdAt}`);
        });
    } catch (err) {
        console.error('Database query error:', err);
    } finally {
        await sequelize.close();
    }
}

check();
