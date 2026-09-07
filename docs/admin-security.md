# Studio access

The owner is the single `ADMIN_EMAIL` configured on the server. The only sign-in provider is Credentials, using `ADMIN_PASSWORD`; there is no registration flow. Auth.js manages encrypted JWT sessions and its default HTTP-only, SameSite cookies (secure on HTTPS). New sessions have an eight-hour lifetime. Keep `AUTH_SECRET`, `ADMIN_PASSWORD`, and storage/database credentials server-only. Rotating `AUTH_SECRET` invalidates existing sessions; changing the password alone does not revoke already-issued tokens.

Every `/admin/*` page passes through an owner allowlist check in Proxy and the authenticated server layout. Data-rendering pages also check ownership before fetching the library. Private APIs independently authorize the owner before parsing requests or touching storage/database records. This covers upload signing, upload finalization, discarding uploads, edits, publishing, clearing unpublished work, collections, location services, local review files, and RAW downloads. The photo-deletion Server Action checks ownership independently; Next.js handles Server Action origin validation. Public photo pages also restrict hidden photos and editing controls to the owner.

Private API writes reject foreign or opaque Origin headers and cross-site browser requests. Proxy supplies private-cache and anti-framing headers; Next.js may replace Cache-Control with its own dynamic-page policy. Admin routes remain excluded from indexing. Public sign-in and Auth.js callback/session endpoints remain reachable by design.

Tests exercise anonymous and unrelated authenticated sessions directly against every private API handler, without relying on Proxy; they also check cross-origin writes and direct deletion actions. Browser checks cover all current admin pages and owner access. No real photos are modified by these checks.

This audit covers Studio pages and administrative operations. It does not make image storage private: existing public image rendition URLs and previously cached images are a separate media-access boundary. Cloudflare Access/MFA, distributed login rate limiting, and storage-origin access controls are not configured by this change. Changes must be deployed before they protect the live site.

References: [Next.js authentication and authorization](https://nextjs.org/docs/app/guides/authentication), [Auth.js session configuration](https://authjs.dev/reference/core#session). Implementation follows the installed Next.js 16.2 documentation.
