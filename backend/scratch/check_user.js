const User = require('../models/User');
const sequelize = require('../config/db');

async function checkUser(email) {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (user) {
            console.log('User found:');
            console.log('- ID:', user.id);
            console.log('- Name:', user.name);
            console.log('- Email:', user.email);
            console.log('- isVerified:', user.isVerified);
            console.log('- OTP:', user.otp);
            console.log('- CreatedAt:', user.createdAt);
        } else {
            console.log('No user found with email:', email);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

const emailToCheck = '22h51a1250@cmrcet.ac.in';
checkUser(emailToCheck);
