const User = require('../backend/models/User');
const sequelize = require('../backend/config/db');

async function promoteAdmin(email) {
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.error('User not found');
            process.exit(1);
        }

        user.isAdmin = true;
        await user.save();
        console.log(`User ${email} is now an admin.`);
        process.exit(0);
    } catch (err) {
        console.error('Error promoting admin:', err.message);
        process.exit(1);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: node promote_admin.js <email>');
    process.exit(1);
}

promoteAdmin(email);
