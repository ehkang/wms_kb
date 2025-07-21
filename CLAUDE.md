# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Warehouse Management System (WMS) Dashboard that provides a web interface for monitoring and managing warehouse operations. The project has two main implementations:

1. **Go Web Server** (main implementation) - A lightweight server that embeds the dashboard HTML and proxies API requests
2. **Electron Desktop App** (alternative) - A full desktop application built with Vue 3 and TypeScript

## Build Commands

### Go Application
```bash
# Build for all platforms (Windows, Linux, macOS)
./build.sh

# Cross-compile with Windows 7 compatibility
./compile.sh

# Build WebAssembly version
./build-wasm.sh

# Run in development
go run main.go
```

### Electron Application
```bash
cd electron

# Install dependencies (uses pnpm)
pnpm install

# Development mode
pnpm dev

# Build for specific platforms
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux

# Lint and format
pnpm lint
pnpm format
```

## Architecture

### Go Backend (`main.go`)
The Go application serves as a lightweight proxy server that:
- Embeds the dashboard HTML file directly in the binary using `//go:embed`
- Proxies API requests to backend services:
  - WMS Server: `http://10.20.88.14:8008`
  - WCS Server: `http://10.20.88.14:8009`
- Handles WebSocket/SignalR connections for real-time updates
- Auto-opens the dashboard in Chrome/default browser on startup
- Supports graceful shutdown (Ctrl+C)

Key endpoints:
- `/` - Serves the embedded kanban.html dashboard
- `/wms/*` - Proxies to WMS server
- `/wcs/*` - Proxies to WCS server
- `/signalr/*` - WebSocket proxy for SignalR hub

### Electron Frontend (`/electron`)
Standard Electron structure with:
- `src/main/` - Main process (app lifecycle, window management)
- `src/preload/` - Preload scripts for secure IPC
- `src/renderer/` - Vue 3 application (UI)

Uses electron-vite for modern development experience with HMR.

### Deployment Options
1. **Standalone Go Binary** - Single executable with embedded HTML
2. **Electron App** - Full desktop application
3. **Nginx + Docker** - Server deployment with reverse proxy (see `/nginx`)

## Key Files to Modify

- `web/kanban.html` - Main dashboard UI (embedded in Go binary)
- `main.go` - Backend server logic and API proxy configuration
- `electron/src/renderer/` - Electron app UI components (Vue 3)
- `nginx/nginx.conf` - Reverse proxy configuration for server deployment

## Development Notes

- The Go server embeds HTML directly, so changes to `web/kanban.html` require rebuilding
- Server URLs are hardcoded in `main.go` - modify the `wmsURL` and `wcsURL` constants
- No formal testing framework is set up - consider adding tests
- The project supports Windows 7 through specific Go build flags in `compile.sh`
- WebSocket connections use gorilla/websocket for proxying SignalR hub