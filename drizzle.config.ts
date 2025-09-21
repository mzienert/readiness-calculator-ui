import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { getEnvOrThrow } from './lib/utils';

// Only load .env.local for local development
// On Vercel, environment variables are injected directly into process.env
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV) {
  config({
    path: '.env.local',
  });
}

// Use production database for production environment, staging for everything else
const databaseUrl = process.env.VERCEL_ENV === 'production'
  ? getEnvOrThrow('POSTGRES_URL_PRODUCTION')
  : getEnvOrThrow('POSTGRES_URL_STAGING');

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
