CREATE TABLE "album_photo" (
	"album_id" uuid NOT NULL,
	"photo_id" varchar(8) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "album_photo_album_id_photo_id_pk" PRIMARY KEY("album_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"subhead" text,
	"description" text,
	"location" jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "albums_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" varchar(8) PRIMARY KEY NOT NULL,
	"url" varchar(255) NOT NULL,
	"extension" varchar(255) NOT NULL,
	"width" integer,
	"height" integer,
	"aspect_ratio" real DEFAULT 1.5,
	"blur_data" text,
	"title" varchar(255),
	"caption" text,
	"semantic_description" text,
	"tags" varchar(255)[],
	"make" varchar(255),
	"model" varchar(255),
	"focal_length" smallint,
	"focal_length_in_35mm_format" smallint,
	"lens_make" varchar(255),
	"lens_model" varchar(255),
	"f_number" real,
	"iso" integer,
	"exposure_time" double precision,
	"exposure_compensation" real,
	"location_name" varchar(255),
	"latitude" double precision,
	"longitude" double precision,
	"film" varchar(255),
	"recipe_title" varchar(255),
	"recipe_data" jsonb,
	"color_data" jsonb,
	"color_sort" smallint,
	"priority_order" real,
	"taken_at" timestamp with time zone NOT NULL,
	"taken_at_naive" varchar(255) NOT NULL,
	"exclude_from_feeds" boolean DEFAULT false,
	"hidden" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "album_photo" ADD CONSTRAINT "album_photo_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_photo" ADD CONSTRAINT "album_photo_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;