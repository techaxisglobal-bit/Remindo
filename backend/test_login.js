const sequelize = require('./config/db');
const ActivityLog = require('./models/ActivityLog');
const User = require('./models/User');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        
        const user = await User.findOne({ where: { email: 'sakethrapaka8@gmail.com' } });
        if (!user) {
            console.log('User not found.');
            return;
        }

        console.log('Found user:', user.id);
        
        await ActivityLog.create({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            ipAddress: '127.0.0.1'
        });
        
        console.log('Activity log created successfully.');
    } catch (err) {
        console.error('Error:', err.message);
        if (err.errors) {
            err.errors.forEach(e => console.error(e.message));
        }
    } finally {
        process.exit();
    }
}

test();
