const sequelize = require('./config/db');

async function fixSequences() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        
        const tables = ['users', 'merchants', 'tasks', 'task_attendees', 'activity_logs'];
        
        for (const table of tables) {
            console.log(`Fixing sequence for ${table}...`);
            const query = `
                SELECT setval(
                    pg_get_serial_sequence('"${table}"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "${table}") + 1, 1),
                    false
                );
            `;
            try {
                await sequelize.query(query);
                console.log(`✅ Sequence fixed for ${table}`);
            } catch (err) {
                console.log(`⚠️ Could not fix sequence for ${table} (maybe no id column or sequence): ${err.message}`);
            }
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

fixSequences();
