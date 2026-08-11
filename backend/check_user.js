const sequelize = require('./config/db');
const { User } = require('./models');

async function checkUser() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const user69 = await User.findByPk(69);
        const user70 = await User.findByPk(70);
        
        console.log('User 69:', user69 ? user69.email : 'Not found');
        console.log('User 70:', user70 ? user70.email : 'Not found');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

checkUser();
