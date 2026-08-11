const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgresql://postgres:Saketh@8919@db.rsiwlktmqoikiqrydopm.supabase.co:5432/postgres', { dialect: 'postgres' });
sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'groups'").then(res => console.log(res[0])).catch(console.error).finally(() => process.exit());
