CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"url_id" uuid NOT NULL,
	"ip" text,
	"user_agent" text,
	"referer" text,
	"country" text,
	"city" text,
	"device" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "urls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"short_code" text NOT NULL,
	"original_url" text NOT NULL,
	"user_id" uuid,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_clicked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "urls_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_url_id_urls_id_fk" FOREIGN KEY ("url_id") REFERENCES "public"."urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;