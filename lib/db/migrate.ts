import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { getEnvOrThrow } from '../utils';

// Only load .env.local for local development
// On Vercel, environment variables are injected directly into process.env
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV) {
  config({
    path: '.env.local',
  });
}

const runMigrate = async () => {
  // Use production database for production environment, staging for everything else
  const databaseUrl = process.env.VERCEL_ENV === 'production'
    ? getEnvOrThrow('POSTGRES_URL_PRODUCTION')
    : getEnvOrThrow('POSTGRES_URL_STAGING');

  const connection = postgres(databaseUrl, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
