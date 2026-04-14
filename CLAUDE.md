# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Repository layout

Two sub-projects, independent:

- **`fullstack/`** — active. A Bun web app (`export.tools`) that extracts attachment URLs from `https://poe.com/s/<id>` share links and builds a zip client-side.
- **`legacy/`** — dormant. Original upstream Selenium-based Python tools. Don't modify unless the user explicitly asks.

Default to working inside `fullstack/`.

## fullstack/ architecture

- **`server.ts`** — Bun HTTP server. Static routes + `/api/share` endpoint that fetches Poe HTML and extracts `__NEXT_DATA__` via `HTMLRewriter`.
- **`app.ts`** — Vanilla TypeScript frontend. Handles UI, calls `/api/share`, generates zip via `client-zip`.
- **`build.ts`** — Bun `compile` into a single executable (`./fullstack`).
- **`static/`** — CSS, icons, OG image. Served from `embeddedFiles` (compiled) or disk (dev).

## Gotchas

- **Railway build target.** `build.ts` compiles to `bun-linux-x64`. For local dev on Apple Silicon, flip `target` to `bun-darwin-arm64-modern` before running `bun run build.ts` — don't commit that change.
- **Manual `VERSION` string.** `build.ts` hardcodes it (`"1.3.17"` in source, last released tag `1.3.19`). Open TODO to derive from git; bump by hand on release.
- **Hash-tolerant static routing.** `server.ts` strips Bun's content-hash suffix (`foo-abc123.png` → `foo.png`) so routes work identically from `embeddedFiles` or disk. Reference assets by their un-hashed name.
- **Dual JSON input formats.** `app.ts` accepts Poe's raw `__NEXT_DATA__` and a simpler `{ messages: [{ role, content, attachments: [{url}] }] }` export shape. Both converge in `parseChatMessages`. Preserve both when editing parse logic.
- **Share-URL validation is duplicated** across `server.ts` and `app.ts`. Keep them in sync.

## Common commands

From `fullstack/`:

```bash
bun install --production   # deps
bun run server.ts          # dev server on :3000 (override via PORT env)
bun run build.ts           # compile standalone ./fullstack binary
./fullstack                # run the compiled binary
```

From `legacy/`:

```bash
pip install -r requirements.txt
python poe_image_downloader.py    # or poe_text_downloader.py / creator_earnings.py
```

No test suite, linter, or formatter is configured.

## Coding conventions

- **Try/catch sparingly.** Reserve for network I/O, disk I/O, user input, resource cleanup, and informational/control-flow exceptions. Do not wrap pure algorithms.
- **TypeScript is strict** with `noUncheckedIndexedAccess` and `noUnusedLocals`. Array/object indexing returns `T | undefined`. Dead code fails type-check.
- **No frontend framework.** Plain DOM APIs in `app.ts`. Don't introduce React/Vue/etc. without explicit ask.
