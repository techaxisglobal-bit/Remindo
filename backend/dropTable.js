const sequelize = require('./config/db');

async function drop() {
  try {
    await sequelize.query('DROP TABLE IF EXISTS "Groups" CASCADE');
    console.log('Groups table dropped');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

drop();
