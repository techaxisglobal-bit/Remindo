require('dotenv').config();


const sequelize = require('./config/db');
require('./models'); // Loads models and associations
const ActivityLog = require('./models/ActivityLog'); // if it's missing in index.js

sequelize.sync({ alter: true }).then(() => {
    console.log('✅ New database schema synced successfully!');
    process.exit(0);
}).catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
});
