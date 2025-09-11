ALTER TABLE "session" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();