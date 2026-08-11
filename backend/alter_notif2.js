const sequelize = require('./config/db');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        await sequelize.query('ALTER TABLE "notifications" DROP COLUMN "relatedTaskId"; ALTER TABLE "notifications" ADD COLUMN "relatedTaskId" INTEGER;');
        console.log('Dropped and re-added column successfully');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}
run();
