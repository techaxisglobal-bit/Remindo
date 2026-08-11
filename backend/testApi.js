const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sequelize = new Sequelize('postgresql://postgres:Saketh@8919@db.rsiwlktmqoikiqrydopm.supabase.co:5432/postgres', { dialect: 'postgres' });

async function test() {
    try {
        const token = jwt.sign(
            { user: { id: 1 } },
            process.env.JWT_SECRET || 'your_jwt_secret_here',
            { expiresIn: '1h' }
        );

        console.log('Fetching with token...');
        const res = await fetch('https://app.remaindo.com/api/groups', {
            headers: { 'x-auth-token': token }
        });
        
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
