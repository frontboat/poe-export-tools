# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bun-based fullstack application that extracts attachment image URLs from Poe share links. The app fetches Poe share HTML, extracts attachment URLs from `__NEXT_DATA__`, and allows users to download attachments as a zip file using client-side compression.

## Architecture

The application consists of:
- **Backend (`server.ts`)**: Bun HTTP server with static file serving and `/api/share` endpoint for fetching Poe share data
- **Frontend (`app.ts`)**: Vanilla TypeScript client handling UI interactions, API calls, and zip generation
- **Build system (`build.ts`)**: Bun compilation script for standalone executable creation
- **Static assets** (`static/` directory): CSS, images, and other frontend resources

## Common Commands

### Development
```bash
bun run server.ts  # Start development server on localhost:3000
```

### Dependencies
```bash
bun install --production  # Install dependencies
```

### Build
```bash
bun run build.ts  # Create standalone executable ./fullstack
```

### Deployment
```bash
./fullstack  # Run the compiled executable
```

## Key Technical Details

### Architecture Patterns
- **Single-file modules**: Main logic is contained in `server.ts` (backend) and `app.ts` (frontend)
- **Static file handling**: Supports both embedded files (compiled) and on-disk files (development)
- **Client-side zip creation**: Uses `client-zip` library to avoid server-side file processing
- **URL validation**: Strict validation for Poe share URLs (`https://poe.com/s/<share-id>`)

### Data Flow
1. User inputs Poe share URL via `/` endpoint
2. Frontend calls `/api/share?url=...` with validated URL
3. Backend fetches Poe HTML and extracts `__NEXT_DATA__` using HTMLRewriter
4. Attachment URLs are parsed from the JSON payload
5. Client downloads attachments directly and creates zip locally

### TypeScript Configuration
- Uses `"module": "Preserve"` and `"moduleResolution": "bundler"`
- Strict mode enabled with additional checks (`noUncheckedIndexedAccess`, `noUnusedLocals`)
- ESNext target with DOM library support

### Build Configuration
- Target: `bun-linux-x64` (change to `bun-darwin-arm64-modern` for local Mac development)
- Minification and bytecode compilation enabled
- Static files bundled with executable using file loaders

## Development Philosophy

The codebase follows principles outlined in `AGENTS.md` regarding minimal try-catch usage. Use try-catch only for:
- Network operations (fetching Poe shares, downloading attachments)  
- File I/O operations
- User input validation
- Resource cleanup

Avoid try-catch around pure algorithms and calculations.