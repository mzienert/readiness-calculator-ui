#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL!);

async function addThreadColumn() {
  try {
    console.log('Adding threadId column to Chat table...');

    // Check if column already exists
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Chat' AND column_name = 'threadId'
    `;

    if (result.length > 0) {
      console.log('✅ threadId column already exists');
      return;
    }

    // Add the column
    await sql`ALTER TABLE "Chat" ADD COLUMN "threadId" varchar(128)`;

    console.log('✅ Successfully added threadId column');
  } catch (error) {
    console.error('❌ Error adding threadId column:', error);
  }
}

addThreadColumn().catch(console.error);