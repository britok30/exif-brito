CREATE TABLE IF NOT EXISTS "sign_in_failures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sign_in_failures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "thumbnail_url" varchar(255);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sign_in_failures_source_created_at_idx" ON "sign_in_failures" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sign_in_failures_created_at_idx" ON "sign_in_failures" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "album_photo_photo_id_idx" ON "album_photo" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_taken_at_id_idx" ON "photos" USING btree ("taken_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_url_idx" ON "photos" USING btree ("url");