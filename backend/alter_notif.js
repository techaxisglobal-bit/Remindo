const sequelize = require('./config/db');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Alter the table manually to prevent sync data loss
        await sequelize.query('ALTER TABLE "notifications" ALTER COLUMN "relatedTaskId" TYPE INTEGER USING "relatedTaskId"::integer;');
        console.log('Altered table successfully');
    } catch (e) {
        if (e.message.includes('cannot be cast automatically to type integer')) {
             await sequelize.query('ALTER TABLE "notifications" DROP COLUMN "relatedTaskId"; ALTER TABLE "notifications" ADD COLUMN "relatedTaskId" INTEGER;');
             console.log('Dropped and re-added column successfully');
        } else {
             console.error('Error:', e);
        }
    } finally {
        process.exit(0);
    }
}
run();
