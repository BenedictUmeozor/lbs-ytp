# D-02 — Report Photo Storage

**Status:** Approved

Public-report photos use Convex File Storage. The application stores only the Convex storage ID; it does not store base64 image data, original filenames, resident-supplied external URLs, or public file URLs.

## Upload flow

Unauthenticated residents validate the full form in the browser first. When a valid optional photo is present, the app requests a short-lived Convex generated upload URL, uploads the file directly, then passes the resulting storage ID to report submission. The submission mutation authoritatively validates `_storage` metadata before associating it with a report.

Only `image/jpeg`, `image/png`, and `image/webp` are accepted. The maximum file size is `5 * 1024 * 1024` bytes (5 MiB). GIF, SVG, HEIC/HEIF, PDF, video, and arbitrary binary files are not accepted.

## Privacy

Photos are application-private by default. Public tracking queries never return a storage ID or photo URL and never call `ctx.storage.getUrl()`. Submitted and tracking pages do not display photos. A report reference is not permission to retrieve a photo, and photo URLs never appear in browser URLs.

A later authenticated fleet-manager query may call `requireFleetManager()` before generating a direct Convex file URL. Such URLs are controlled-MVP bearer URLs and may be reused by anyone who receives one; strict per-request photo authorization is outside this phase.

## Controlled-MVP limitation

The generated upload URL mutation is intentionally public because residents do not have accounts. Abuse prevention, rate limiting, and orphaned-upload cleanup are production concerns outside this controlled MVP.
