import {
  pgTable,
  varchar,
  text,
  integer,
  smallint,
  real,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
  uuid,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const photos = pgTable('photos', {
  id: varchar({ length: 8 }).primaryKey(),
  url: varchar({ length: 255 }).notNull(),
  thumbnailUrl: varchar({ length: 255 }),
  extension: varchar({ length: 255 }).notNull(),
  width: integer(),
  height: integer(),
  aspectRatio: real().default(1.5),
  blurData: text(),
  title: varchar({ length: 255 }),
  caption: text(),
  semanticDescription: text(),
  tags: varchar({ length: 255 }).array(),
  make: varchar({ length: 255 }),
  model: varchar({ length: 255 }),
  focalLength: smallint(),
  focalLengthIn35mmFormat: smallint('focal_length_in_35mm_format'),
  lensMake: varchar({ length: 255 }),
  lensModel: varchar({ length: 255 }),
  fNumber: real(),
  iso: integer(),
  exposureTime: doublePrecision(),
  exposureCompensation: real(),
  locationName: varchar({ length: 255 }),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  film: varchar({ length: 255 }),
  recipeTitle: varchar({ length: 255 }),
  recipeData: jsonb(),
  colorData: jsonb(),
  colorSort: smallint(),
  priorityOrder: real(),
  takenAt: timestamp({ withTimezone: true }).notNull(),
  takenAtNaive: varchar({ length: 255 }).notNull(),
  excludeFromFeeds: boolean().default(false),
  hidden: boolean().default(false),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
}, table => [
  // Every list reads newest first; uploads look a photograph up by its storage URL.
  index('photos_taken_at_id_idx').on(table.takenAt.desc(), table.id.desc()),
  index('photos_url_idx').on(table.url),
]);

export const albums = pgTable('albums', {
  id: uuid().primaryKey().defaultRandom(),
  title: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique(),
  subhead: text(),
  description: text(),
  location: jsonb(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow(),
  createdAt: timestamp({ withTimezone: true }).defaultNow(),
});

export const albumPhoto = pgTable(
  'album_photo',
  {
    albumId: uuid()
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    photoId: varchar({ length: 8 })
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),
    sortOrder: smallint().notNull().default(0),
  },
  table => [
    primaryKey({ columns: [table.albumId, table.photoId] }),
    // The primary key leads with the album; finding a photograph's albums needs its own index.
    index('album_photo_photo_id_idx').on(table.photoId),
  ],
);

/** Failed studio sign-ins, keyed by a salted hash of the client address, for rate limiting. */
export const signInFailures = pgTable('sign_in_failures', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  source: varchar({ length: 64 }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('sign_in_failures_source_created_at_idx').on(table.source, table.createdAt),
  index('sign_in_failures_created_at_idx').on(table.createdAt),
]);

export type Photo = typeof photos.$inferSelect;
export type PhotoInsert = typeof photos.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type AlbumInsert = typeof albums.$inferInsert;
