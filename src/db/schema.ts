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
});

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
  table => [primaryKey({ columns: [table.albumId, table.photoId] })],
);

export type Photo = typeof photos.$inferSelect;
export type PhotoInsert = typeof photos.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type AlbumInsert = typeof albums.$inferInsert;
