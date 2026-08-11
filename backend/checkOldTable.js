const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgresql://postgres:Saketh@8919@db.rsiwlktmqoikiqrydopm.supabase.co:5432/postgres', { dialect: 'postgres' });

async function test() {
    try {
        const res = await sequelize.query('SELECT * FROM "Groups"');
        console.log('Groups exists:', res[0].length);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
test();
