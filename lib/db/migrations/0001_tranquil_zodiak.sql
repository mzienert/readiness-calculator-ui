CREATE TABLE IF NOT EXISTS "AssessmentSnapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" varchar(128) NOT NULL,
	"agentType" varchar NOT NULL,
	"snapshotData" json NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
DROP TABLE "Stream";