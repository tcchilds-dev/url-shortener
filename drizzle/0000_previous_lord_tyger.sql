CREATE TABLE "urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shortCode" text NOT NULL,
	"originalUrl" text NOT NULL,
	"clickCount" integer DEFAULT 0 NOT NULL,
	"lastClickedAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "urls_shortCode_unique" UNIQUE("shortCode")
);
