-- Manual SQL to add threadId column to Chat table
ALTER TABLE "Chat" ADD COLUMN "threadId" varchar(128);