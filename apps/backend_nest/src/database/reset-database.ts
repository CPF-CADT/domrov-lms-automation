import { seed } from '../libs/entities/seed';
import AppDataSource from './data-source';

async function resetDB() {
    try {
        // 1. Initialize the data source
        await AppDataSource.initialize();
        console.log('🌱 DataSource initialized.');

        // 2. Drop the entire database (all tables)
        await AppDataSource.dropDatabase();
        console.log('🧹 All tables dropped.');

        await AppDataSource.query(`DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN
                    SELECT n.nspname AS schema_name, t.typname AS type_name
                    FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typtype = 'e'
                LOOP
                    EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.schema_name) || '.' || quote_ident(r.type_name) || ' CASCADE';
                END LOOP;
            END$$;`);

        // 3. Recreate tables based on entities
        await AppDataSource.synchronize();
        console.log('🛠 Tables recreated from entities.');

        // 4. Seed initial data (like Super Admin)
        await seed();
        console.log('🌟 Seeding completed.');

        console.log('✅ Database reset completed!');
    } catch (err) {
        console.error('❌ Failed to reset database:', err);
    }
}
