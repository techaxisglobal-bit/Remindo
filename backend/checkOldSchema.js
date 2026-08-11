const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgresql://postgres:Saketh@8919@db.rsiwlktmqoikiqrydopm.supabase.co:5432/postgres', { dialect: 'postgres' });

async function test() {
    try {
        const res = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Groups'");
        console.log(res[0]);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
test();
