# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo is a fork of `JohnSmith-132/poe-export-tools` with two **independent, non-interacting** sub-projects:

1. **`fullstack/`** — the active project. A Bun web app (`export.tools`) that extracts attachment URLs from `https://poe.com/s/<id>` share links and builds a zip client-side. See `fullstack/CLAUDE.md` for architecture, commands, and `fullstack/AGENTS.md` for the try/catch philosophy that governs that code.
2. **`legacy/`** — the **original upstream** Selenium-based Python tools (`poe_image_downloader.py`, `poe_text_downloader.py`, `creator_earnings.py`) and their README. Not under active development in this fork. Treat as legacy unless the user explicitly asks to modify them.

Default to working inside `fullstack/` unless the task clearly targets `legacy/`.

## Which CLAUDE.md wins

When working in `fullstack/`, `fullstack/CLAUDE.md` is authoritative for that sub-project (commands, architecture, TS config). This root file only covers what spans both sub-projects or what isn't captured there.

## fullstack/ — things not in fullstack/CLAUDE.md

- **Deployment target is Railway.** The build compiles to `bun-linux-x64` by default (see `build.ts`). For local dev on Apple Silicon you must edit `build.ts` to `bun-darwin-arm64-modern` before running `bun run build.ts`, otherwise the produced binary won't execute on your machine. Don't commit that change.
- **Version string is manual.** `build.ts` hardcodes `VERSION` (currently `"1.3.17"` in source, last released tag `1.3.19`). There's an open TODO in `fullstack/README.md` to derive this from the git commit id — until that's done, bump it by hand when cutting a release.
- **Static asset routing is hash-tolerant.** `server.ts` strips Bun's content-hash suffix (e.g. `foo-abc123.png` → `foo.png`) so that routes work identically whether served from `embeddedFiles` (compiled binary) or the on-disk `static/` dir (dev). If you add an asset, reference it by its un-hashed name in HTML/CSS (e.g. `/static/faviconpng.png`, not the hashed filename).
- **Dual input formats.** The frontend (`app.ts`) accepts two shapes of uploaded JSON: Poe's raw `__NEXT_DATA__` payload and a simpler `{ messages: [{ role, content, attachments: [{url}] }] }` export format. Both paths converge in `parseChatMessages`. Preserve both when editing parse logic.
- **Share URL validation is strict on both sides.** `normalizeShareUrl` in `server.ts` and `app.ts` both reject anything other than `https://poe.com/s/<id>` with no query/hash/auth. Keep them in sync if you change one.

## Common commands

Run from `fullstack/`:

```bash
bun install --production   # deps
bun run server.ts          # dev server on :3000 (override via PORT env)
bun run build.ts           # compile standalone ./fullstack binary
./fullstack                # run the compiled binary
```

Python scripts (from `legacy/`):

```bash
cd legacy
pip install -r requirements.txt
python poe_image_downloader.py    # or poe_text_downloader.py / creator_earnings.py
```

No test suite, linter, or formatter is configured in either sub-project.

## Coding conventions

- Follow `fullstack/AGENTS.md` on try/catch: reserve it for network I/O, disk I/O, user input, resource cleanup, and informational/control-flow exceptions. Do not wrap pure algorithms.
- TypeScript is strict with `noUncheckedIndexedAccess` and `noUnusedLocals` — array/object indexing returns `T | undefined`, and dead code will fail type-check.
- The fullstack app has **no framework** on the frontend — plain DOM APIs in `app.ts`. Don't introduce React/Vue/etc. without an explicit ask.
