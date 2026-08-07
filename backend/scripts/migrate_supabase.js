require('dotenv').config({ path: __dirname + '/../.env' });
const { Client } = require('pg');

async function migrateData() {
    const OLD_DB_URL = process.env.OLD_DATABASE_URL;
    const NEW_DB_URL = process.env.NEW_DATABASE_URL;

    if (!OLD_DB_URL || !NEW_DB_URL) {
        console.error('❌ Please provide both OLD_DATABASE_URL and NEW_DATABASE_URL in your .env or environment.');
        process.exit(1);
    }

    console.log('🔄 Connecting to databases...');
    
    const oldClient = new Client({
        connectionString: OLD_DB_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    const newClient = new Client({
        connectionString: NEW_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await oldClient.connect();
        await newClient.connect();
        console.log('✅ Connected to both databases successfully!');

        const tables = ['users', 'merchants', 'tasks', 'task_attendees', 'activity_logs'];
        console.log(`📋 Found ${tables.length} tables to migrate:`, tables.join(', '));

        // Migrate data table by table
        for (const table of tables) {
            console.log(`⏳ Migrating table: ${table}...`);
            const dataRes = await oldClient.query(`SELECT * FROM "${table}"`);
            const rows = dataRes.rows;
            
            if (rows.length === 0) {
                console.log(`   └ Skipping ${table} (0 rows)`);
                continue;
            }

            // Construct insert query
            const columns = Object.keys(rows[0]);
            const colNames = columns.map(c => `"${c}"`).join(', ');
            
            let insertedCount = 0;
            for (const row of rows) {
                const values = columns.map((_, i) => `$${i + 1}`);
                const query = `INSERT INTO "${table}" (${colNames}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`;
                const rowData = columns.map(col => row[col]);
                
                try {
                    await newClient.query(query, rowData);
                    insertedCount++;
                } catch (err) {
                    console.error(`   ❌ Failed to insert row in ${table}:`, err.message);
                }
            }
            console.log(`   └ ✅ Inserted ${insertedCount} rows into ${table}`);
        }

        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await oldClient.end();
        await newClient.end();
    }
}

migrateData();
