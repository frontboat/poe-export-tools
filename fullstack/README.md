# fullstack

Small Bun fullstack app to extract attachment image URLs from Poe share links.

## How it works

- `/` serves a minimal UI where you paste a Poe share URL and press Enter.
- `/api/share?url=...` fetches the share HTML and extracts attachment URLs from `__NEXT_DATA__`.
- `/api/file?url=...` proxies image files so previews are same-origin (cache-friendly).
- `/api/zip?url=...` fetches attachments and returns a single zip download.

To install dependencies:

```bash
bun install --production
```

To run locally:

```bash
bun run server.ts
```

Open `http://localhost:3000`.

To build a standalone executable:

```bash
bun run build.ts
```

To run:

```bash
./fullstack
```
