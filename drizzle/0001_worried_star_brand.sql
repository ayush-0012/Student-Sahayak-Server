ALTER TABLE "users" ALTER COLUMN "phone_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");