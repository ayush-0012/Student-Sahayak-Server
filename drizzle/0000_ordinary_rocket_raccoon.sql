CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"planId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planName" varchar NOT NULL,
	"planPrice" integer NOT NULL,
	"userId" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"userId" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" varchar,
	"fullName" varchar(225) NOT NULL,
	"age" integer NOT NULL,
	"exam" varchar(225) NOT NULL,
	"phone_number" text,
	"phone_number_verified" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_userId_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_userId_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("userId") ON DELETE cascade ON UPDATE no action;