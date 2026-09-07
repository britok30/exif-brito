# Brito — Photographs

Kelvin Brito’s personal photographic archive, built with Next.js 16, React 19, Postgres (Neon / Drizzle), and S3. The gallery supports a contact sheet and editorial view, filters, and individual photograph pages with capture details and film recipes.

## Development

Use Node.js 22.14 or newer. Install dependencies with `yarn install`, copy `.env.example` to `.env`, and configure the database, S3, and administrator credentials. Storage is any S3-compatible bucket: leave `AWS_S3_ENDPOINT` empty for Amazon S3, or set it to an endpoint such as Cloudflare R2 (`https://<account-id>.r2.cloudflarestorage.com`), where the bucket is addressed by path and the region can stay empty. To move an existing library, fill in the `TARGET_S3_*` variables, run `node scripts/copy-storage.mjs` to copy every object, then `node scripts/migrate-storage-urls.mjs <old-base> <new-base> --apply` to point the database at the new bucket, and finally switch the `AWS_S3_*` variables over. Initialize a new database with `npm run db:migrate`, then run `npm run dev`.

Sign in at `/sign-in` and upload at `/admin/upload`. Original images are stored in S3; EXIF is extracted into Postgres, with separate display thumbnails. Individual photographs live at `/p/[id]`. Hidden photographs are not available on public detail pages. Gallery tiles render through `next/image`, which fetches display copies from the stable `/api/image/<storage key>` route (no signature in the URL, so renditions cache for a year) and serves each tile a rendition sized to its column instead of the 2560px copy. Blur placeholders are inlined only when a photograph's stored blur data is small; oversized legacy blur data is left out of the query itself. Photo lists are read through `src/photo/query.ts`, which caches them under the `photos` tag until a photograph is added, edited, or removed (every mutation calls `revalidatePhotos`), so a page render costs no database round trip in the steady state. Gallery pages never presign URLs; only the photograph page signs the two it needs for the viewer. The cached public list is stored as chunks of 300 rows because Next caches at most 2 MB per entry. Tiles receive a slim `GalleryPhoto` record (`src/photo/gallery-photo.ts`) rather than the full row, with blur placeholders only for the first sixty. The home page renders the first 96 tiles on the server; each year's remainder streams in batches of 96 from `/api/gallery` as a sentinel below the last tile nears the viewport, so the initial page is a fraction of the archive's size while still becoming one continuous page.

## Appearance

The site is black on white, or white on black. A visitor's choice from the "Light / Dark" toggle is kept in `localStorage`; without one, the system preference is followed. `public/theme-boot.js`, loaded from the root layout with `next/script` before anything interactive, applies the theme before first paint, so there is no flash; the toggle resolves the theme itself if the layout was rendered on the client without it, and the active side of the toggle is styled from the `data-theme` attribute so it is right in server-rendered HTML. Every page, public or studio, opens the same way: the navigation, an intro with a small label, one large title and a quiet aside (`StudioIntro`), then a rule-topped toolbar with status in the centre and controls on the right, then content. Message pages (not found, error) use the same opening through `PageMessage`. Every colour in the stylesheet comes from the `--bg`, `--fg`, `--fg-2`, and `--fg-3` tokens. Switching cross-fades a snapshot of the page over 0.64 s with the View Transitions API, which costs one style pass instead of a CSS transition on every element (measured at 44,000 simultaneous animations on the gallery); browsers without it, and reduced-motion settings, switch instantly. Page loads and system changes are always instant.

## Bringing over exif-photo-blog

The legacy source checkout is `../exif-photo-blog`. Its EXIF extraction work is already represented in `src/exif`, including Fujifilm recipes and Nikon picture controls. The destination currently has its own configured database; do not point schema migration commands at the legacy database.

Import either a JSON array of legacy photo rows (snake_case or camelCase), an object with a `photos` array, or read directly from a legacy Neon database using `LEGACY_DATABASE_URL`.

```sh
# Validate without writing anything
npm run import:legacy -- /path/to/photos.json

# Insert missing photographs after reviewing validation
npm run import:legacy -- /path/to/photos.json --apply

# Alternatively set LEGACY_DATABASE_URL in your environment, then:
npm run import:legacy
npm run import:legacy -- --apply
```

The importer validates the full input before writes, keeps original IDs and URLs, preserves capture timestamps and camera-local dates, EXIF, tags, captions, film recipes, color data, and visibility. Existing IDs are skipped, never overwritten. Inserts run in one transactional batch, so a failed insert rolls back all new rows. The source database is only queried with SELECT.

The basic importer only copies records. To move image hosting as well, first compare source and destination originals by SHA-256, review visual matches, and record confirmed duplicates as an array of `{ "legacyId": "old-id", "existingId": "current-id" }` objects (or `[]`). Then stage the files:

```sh
node --experimental-strip-types scripts/stage-legacy-storage.mjs /path/to/photos.json /path/to/duplicates.json /path/to/prepared.json --apply
npm run import:legacy -- /path/to/prepared.json
npm run import:legacy -- /path/to/prepared.json --apply
```

Staging copies originals unchanged into the configured S3 bucket and creates 2560px display renditions with the existing gallery image pipeline. It records dimensions, derives known city labels from legacy tags, and uses GPS for missing labels where available. Reviewed duplicates and existing IDs are skipped. SHA-256 metadata and conditional writes protect completed copies on retry. The database stays unchanged until the prepared file is imported; failed staging can leave reusable storage objects but never partial gallery entries. Keep private source/destination snapshots and the reviewed duplicate mapping for reconciliation. Album memberships need a separate import.

Migration completed on September 6, 2026: 295 legacy photos checked against 58 current photos. Ten byte-identical originals were excluded; their IDs and SHA-256 checksums are recorded in [`scripts/legacy-duplicates.json`](scripts/legacy-duplicates.json). The remaining 285 originals and previews were copied to current S3 storage and imported, bringing the library to 343 photos. All 58 existing records were verified unchanged, with no imported metadata mismatches. The original source database and files were retained. Imported records include 275 location labels and 122 GPS coordinate pairs; ten have no known location.

## Verification

```sh
npm run test:run
npm run typecheck
npm run build
```

Tests cover EXIF fixtures, upload APIs, storage, geocoding, capture formatting, and legacy metadata import. No deployment or database import happens during these checks.

## Upload Studio

Open `/admin/upload` after signing in. Select one photograph, select multiple files, choose a folder, or drag files onto the drop area. Each original is uploaded unchanged. Display copies are separate progressive JPEGs, up to 2560px wide at quality 90 with 4:4:4 chroma and the embedded ICC profile retained. Thumbnails are never enlarged. These settings apply to new uploads; existing thumbnails are not rewritten.

The queue processes at most three photographs at once. Review individual titles, captions, tags, locations, and public/hidden visibility, or select multiple entries to append shared tags and apply a location or visibility. Publish individually, publish selected, or use Publish all to publish the current batch as uploads finish. Pause stops new work while active photographs finish. Failed entries can be retried independently; publishing retries reuse the original upload key and cannot create a second record for that key.

Unfinished queue entries and original files are saved to IndexedDB in the same browser. Refreshing recovers them for review; recovery never automatically publishes. Uploads are not background jobs: keep Studio open while they run. Recovery depends on available browser storage; clearing site data clears drafts. Files are stored once, separately from editable metadata. Clearing published entries only clears the queue, not the gallery.

Supported selections: JPEG, PNG, WebP, HEIC, HEIF, up to 50 MB per file. HEIC/HEIF processing depends on the server's image codec; unsupported files get an actionable JPEG-export error. RAW and video are not supported. Duplicate selections are detected within the current/recovered queue by filename, size, and modification time; this is not a content-hash search across all previously published photographs. Originals are never resized or compressed on the client.

The workflow was reviewed against Sam Becker's upstream `exif-photo-blog` at `35f469e` (2026-08-30), particularly its batch processing and metadata review. Studio's queue, recovery, and S3 publishing implementation are local to this project. Tests cover queue concurrency, pause/resume, cancellation, recovery, metadata merging, idempotent publishing, image orientation, and ICC preservation.

## Consistent location names

Gallery and Journal use compact city/country labels, while photograph pages retain full street addresses. Known manually entered `Kyoto` and `Tokyo` locations normalize to `Kyoto, Japan` and `Tokyo, Japan` when saving, uploading, or importing. Missing upload/import locations may use a single recognized city tag. Tags remain unchanged so existing filters keep working. Unknown cities are not assigned a country automatically, and explicitly clearing a location in the editor remains supported.

Review existing records with `node --experimental-strip-types scripts/standardize-locations.mjs`. Add `--apply` to save the reviewed corrections; the script writes a private backup in `/tmp` and checks exact update timestamps to avoid overwriting concurrent edits.

## Private photo editing

Open `/admin/photos` to edit published and hidden photographs, or use Edit on a photograph page. The editor preserves unsaved input after failed saves, confirms discarded changes, and keeps Save/Cancel visible on small screens. Location entry uses authenticated Google Places autocomplete with worldwide suggestions and keyboard navigation; manual entry remains available. The server uses `GOOGLE_PLACES_API_KEY` when present, falling back to `GOOGLE_MAPS_API_KEY`; enable Places API (New) for that key. Place selection changes the editable location label, not original EXIF coordinates.

## Immersive photo viewer

Click a gallery or Journal image to browse its current selection in a fullscreen viewer; caption links still open the detail page, and modified clicks retain normal link behavior. Swipe or use Left/Right to move between photographs. Pinch, double-tap/double-click, or use the zoom controls to enlarge up to 4×, then drag to pan within the image bounds. With the image focused, use `+`/`−` to zoom, `0` to reset, and Shift + arrow keys to pan. Zooming uses the display copy. Adjacent display copies are prefetched; originals are not served by the public viewer.

Escape, Close, or browser Back closes the viewer and restores the opener's focus and exact scroll position without remounting the gallery. Browser Forward reopens it. The URL hash identifies the active photograph and supports direct links while retaining gallery filters. Public viewers only receive public photographs; a hidden photograph's private detail viewer is limited to that photograph. Display-image errors offer retries, zoom resets between photographs, and reduced-motion preferences are respected. The same viewer is available in Studio and on photograph detail pages.

## Curated collections

Open `/admin/collections` (also linked from the private photo library) to create a series, select photographs, and arrange their order. The first non-hidden photograph becomes its cover. Saving makes visible members available at `/collections/<slug>`; a collection with no visible members is omitted publicly. Collections use the existing `albums` and `album_photo` tables, and metadata and membership save in one transaction. Removing a collection leaves all original photographs intact.

Public collection pages retain their sequence across Gallery, Journal, and the immersive viewer. Hidden photographs are excluded from public collection queries, covers, counts, and viewer data. URL names are unique, failed saves retain edits, and leaving a changed editor prompts before discarding them.

## Uploading and reviewing photographs

The Neon `photos` table is the source of truth for saved photographs, EXIF, locations, and visibility. R2 stores originals and generated display copies. A browser upload queue or a local SD-card manifest is temporary staging, not the saved library.

- `/admin/upload`: choose new files and manage their upload queue. Recovery drafts live in this browser's IndexedDB until they are finalized into the library. The existing upload controls can finalize a photograph as published or hidden.
- `/admin/unpublished`: review every saved, unpublished photograph, regardless of whether it came from a single upload, a batch, a migration, or an SD-card import. Select photographs here and explicitly publish the selection.
- `/admin/photos`: manage the complete saved library, including published photographs.
- `/admin`: private dashboard with library totals, unpublished destinations, uploads, collections, and a confirmed clear-unpublished action. `/admin/review` has been removed.
- Publishing a selection leaves other unpublished photographs saved. Clearing unpublished removes only the confirmed records that remain unpublished, including their collection memberships; stored image files and SD-card originals are retained. New imports and published records are excluded. Library pagination supports direct page entry while preserving filters.

The previous review page read `.local/photo-review/manifest.json`, a single computer-local snapshot last prepared for London. It did not follow database imports and is no longer the Studio review screen. The legacy preparation scripts and authenticated file-reading helpers remain available for local tooling, but their manifests are not a source of truth for library contents or publication status.

Published photographs have their own Studio page at `/admin/published`. Old visibility query links redirect to the corresponding page, preserving search, destination, view, and page number.
