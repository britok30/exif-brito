# Photograph protection

Reviewed September 7, 2026.

The application discourages casual saving; it cannot make publicly viewable pixels impossible to copy. Screenshots, browser tools, and clients that ignore browser policies remain possible.

## Application changes

- Image context menus and drag starts are suppressed. Mobile callouts and selection are disabled on images. Ordinary text, links, keyboard navigation, and zoom controls remain usable.
- Printed pages omit photographs.
- The public viewer has no original-file link and never fetches an original when zooming.
- Former `/api/image/photos/<original>` URLs return 404 with no-store. Existing `/api/image/photos/thumb/…` display copies continue to work.
- Legacy photographs without thumbnails use `/api/image/display/photos/…`. The server re-encodes these into JPEG, caps both dimensions at 2560 pixels, and removes EXIF while retaining the ICC profile. Conversion failure never falls back to source bytes. Stored files remain untouched.
- Image responses and the Next image optimizer have `Cross-Origin-Resource-Policy: same-site`. The image route also rejects requests declaring `Sec-Fetch-Site: cross-site`. These are browser embedding restrictions, not authentication or bot detection. Social OG endpoints remain separate.

## Deployment and outstanding checks

These application changes require deployment. Cloudflare's existing AI crawler and country rules are already live.

Previously cached original responses cannot be revoked from visitors' browsers. After deployment, purge the old original URLs from the CDN; the new display namespace avoids reusing their cache entries. Check both direct image and Next optimizer paths after deployment.

R2 managed-domain and custom-domain audit calls currently return 403. The token needs Account → Workers R2 Storage → Read to verify public bucket exposure. Keep original storage private; disable any public R2 development address that bypasses site protection. The Vercel origin-bypass audit also remains outstanding. Do not describe originals as fully isolated until these checks are complete.

The existing Cloudflare original-download rate rule targets the old original URL prefix. It does not cover the new display namespace or normal thumbnails. A separate measured rate policy should account for gallery batches and Next's server-side optimizer before limiting all display requests.

## Research and tradeoffs

- [MDN: contextmenu](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event): Firefox explicitly allows Shift-right-click to bypass a site's handler. Disabling browser shortcuts or developer tools is not a security boundary.
- [MDN: Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy): browser-enforced restrictions can prevent cross-site image embedding. They do not stop a client from fetching a public URL directly.
- [Cloudflare: Hotlink Protection](https://developers.cloudflare.com/waf/tools/scrape-shield/hotlink-protection/): visitors can still download images; the feature checks nonempty referrers and only selected file extensions. Its blanket toggle is insufficient for Next's `/_next/image` route and may affect image search or social embeds.
- [Cloudflare: public R2 buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/): a public `r2.dev` address must be disabled when relying on WAF or Access through a custom domain.

Visible watermarks and smaller public renditions would impose further costs on reuse, but change the presentation. Neither is applied automatically to this gallery. Expiring links alone cannot stop someone who can load the public page from obtaining a fresh link. Keep originals private, retain display-only delivery, and use traffic evidence to tune edge rules rather than adding a CAPTCHA to every photograph.
