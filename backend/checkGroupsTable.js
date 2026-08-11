const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgresql://postgres:Saketh@8919@db.rsiwlktmqoikiqrydopm.supabase.co:5432/postgres', { dialect: 'postgres' });

async function test() {
    try {
        // Query to see if the table exists
        const res = await sequelize.query('SELECT * FROM groups');
        console.log('groups table exists, rows:', res[0].length);
    } catch (err) {
        console.error('Error querying groups table:', err);
    } finally {
        process.exit();
    }
}
test();
