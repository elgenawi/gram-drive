# Gram Drive

**Turn Telegram Saved Messages into your personal cloud drive.**

Gram Drive is an Electron desktop app that uses Telegram's free, unlimited storage as a backend for file management. Upload, download, organize, preview, and stream your files — all through your Telegram account, with zero subscription fees.

---

## Status

| Badge | Status |
|-------|--------|
| Development | Active |
| Platform | Windows (portable) |
| License | MIT |
| Telegram Library | GramJS v2.26+ |

---

## Features

### Cloud Storage
- **Unlimited storage** via Telegram Saved Messages (40+ file size cap via Telegram Premium)
- **Two-way database sync** — SQLite metadata is synced to Telegram as an encrypted document, enabling cross-device consistency
- **Auto-indexing** — New files sent to Saved Messages are detected in real-time and indexed automatically
- **Multi-device ready** — Download the DB on a new machine and all metadata is restored instantly

### File Management
- **Full CRUD** — Create folders, rename, delete (recursive), move via drag-and-drop
- **Hierarchical folders** — Nested directory structure with breadcrumb navigation
- **Upload/Download** — Native file dialogs with multi-select upload, save-as download
- **Search** — Client-side filename filtering across the current folder

### Media Streaming & Preview
- **Video streaming** — Local HTTP server with HTTP Range support for seeking, built to work around Electron's protocol handler limitations
- **Image preview** — Full-resolution modal overlay with zoom-to-fit
- **Thumbnail extraction** — Automatic thumbnail generation from Telegram media for images and videos

### File Type System
- **129 file extension icons** (`.pdf`, `.js`, `.zip`, `.mp4`, `.jpg`, etc.) — all sourced from high-res PNG assets
- **5 base type fallback icons** (image, video, audio, archive, generic)
- **35 folder icon variants** (dark, normal, legacy styles)
- **Smart resolution chain**: extension match -> type match -> default fallback -> Lucide icon fallback
- **Client-side icon caching** via in-memory Map to minimize IPC round-trips

### User Interface
- **Windows 11-style grid view** — Large icon cards with full-cover thumbnails, file name, and size
- **List view** — Columnar layout (Name, Size, Modified, Actions) for dense browsing
- **Custom frameless title bar** — Draggable window with min/max/close controls
- **Dark / Light / System themes** — Persisted to localStorage, applied at the HTML root level
- **Sync status indicators** — Cloud icons in sidebar and status bar showing sync state
- **Warning banners** — Amber-colored notifications for sync failures with dismiss

### Authentication & Security
- **Telegram phone authentication** with SMS code verification
- **2FA password support** via SRP (Secure Remote Password) protocol
- **Session persistence** — String session saved to disk, auto-restored on launch
- **Country selector** — 180+ countries with flags and searchable dropdown

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 35 |
| UI Framework | React 19 + TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) |
| Icons | Lucide React + Custom PNG assets (256x256) |
| Routing | React Router DOM v7 |
| Telegram Client | GramJS (telegram npm) |
| Database | better-sqlite3 (WAL mode) |
| Streaming | Node.js built-in HTTP server |
| Packaging | electron-builder (Windows portable) |

---

## Project Structure

```
gram-drive/
├── electron/                  # Electron main process (CommonJS)
│   ├── main.js                # App entry, window, HTTP stream server
│   ├── ipc.js                 # IPC handler registry (all channels)
│   ├── preload.js             # Context bridge (window.electronAPI)
│   ├── telegram.js            # GramJS client, auth, session
│   ├── database.js            # SQLite CRUD (better-sqlite3)
│   ├── sync.js                # DB sync, Telegram indexing, thumbnails
│   ├── files.js               # File upload/download/cache
│   ├── icons.js               # Icon resolution from assets
│   └── logger.js              # Structured console logger
├── src/                       # React renderer (TypeScript + JSX)
│   ├── pages/
│   │   ├── SplashPage.tsx     # Loading screen + auth check
│   │   ├── LoginPage.tsx      # Phone -> Code -> 2FA flow
│   │   └── DashboardPage.tsx  # Main file manager
│   ├── components/
│   │   ├── title-bar.tsx      # Custom window controls
│   │   ├── dashboard-sidebar.tsx
│   │   ├── dashboard-toolbar.tsx
│   │   ├── file-grid-view.tsx # Windows 11-style grid cards
│   │   ├── file-list-view.tsx # Table-style list
│   │   ├── file-icon.tsx      # Smart icon with caching
│   │   ├── name-dialog.tsx    # Create/rename folder modal
│   │   ├── preview-modal.tsx  # Image/video overlay
│   │   ├── mode-toggle.tsx    # Theme switcher
│   │   └── theme-provider.tsx # Theme context
│   ├── lib/
│   │   ├── utils.ts           # cn() helper
│   │   └── dashboard-utils.ts # formatSize, formatDate, sidebarItems
│   ├── data/countries.ts      # 180+ country codes
│   ├── vite-env.d.ts          # Global types
│   ├── main.tsx               # React entry
│   ├── App.tsx                # Router
│   └── index.css              # Tailwind + theme variables
├── assets/
│   ├── Images/Files/Base/     # 5 base file type icons
│   ├── Images/Files/Extensions/ # 129 extension icons
│   ├── Images/Folders/All/    # 35 folder icons
│   ├── Icons/Flags/           # 255 country flag PNGs
│   ├── Fonts/                 # Segoe MDL2 icon font
│   └── StoreImages/           # Windows Store assets
├── config.example.json        # API credentials template
├── components.json            # shadcn/ui config
├── vite.config.ts             # Vite + Tailwind + React
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (tested with 20+)
- **npm** 9+
- **Telegram API credentials** (apiId and apiHash) from https://my.telegram.org/apps
- **Windows** (currently packaged as Windows portable; Linux/macOS can run in dev mode)

### Installation

```bash
# Clone the repository
git clone https://github.com/elgenawi/gram-drive.git
cd gram-drive

# Install dependencies
npm install

# Configure Telegram API credentials
cp config.example.json config.json
# Edit config.json with your own apiId and apiHash
```

### Configuration

Edit `config.json`:

```json
{
  "apiId": 123456,
  "apiHash": "your-api-hash-here"
}
```

To get these values:
1. Go to https://my.telegram.org/apps
2. Log in with your Telegram account
3. Create a new application
4. Copy the **api_id** and **api_hash**

> **Important**: Keep your `apiHash` private. Never commit it to version control.

### Development

```bash
# Start in development mode (Vite hot-reload + Electron)
npm run dev
```

This launches Vite on `localhost:5173`, waits for it to be ready, then starts Electron pointing at the dev server.

### Building

```bash
# Build for production
npm run build
```

This produces a Windows portable executable in the `release/` directory.

---

## Usage

1. **Launch** Gram Drive
2. **Authenticate** with your Telegram account (phone number + verification code + 2FA if enabled)
3. **First sync** — the app will create a local database, scan Saved Messages for existing files, and index them
4. **Manage files** — upload, download, create folders, rename, delete, move via drag-and-drop
5. **Preview** — click an image to preview, double-click a video to stream
6. **Sync** — the database auto-syncs to Telegram; manual sync available via sidebar

### Key Actions

| Action | How |
|--------|-----|
| Select item | Single-click |
| Open folder / Preview file | Double-click |
| Move file | Drag onto a folder |
| Upload | Click "Upload Files" in sidebar |
| Create folder | Click "New Folder" in sidebar |
| Rename | Hover item, click pencil icon |
| Delete | Hover item, click trash icon |
| Toggle view | Grid/List buttons in toolbar |
| Search | Type in search bar (filters by name) |
| Manual sync | Click "Sync Now" in sidebar |

---

## Keywords

telegram, cloud-storage, electron, file-manager, react, typescript, gramjs, mtproto, sqlite, better-sqlite3, tailwindcss, shadcn-ui, vite, desktop-app, windows, video-streaming, thumbnail-generator, file-icons, drag-and-drop, dark-mode, two-factor-authentication, unlimited-storage, saved-messages, file-management, media-preview, http-streaming, range-requests, portable

---

## Architecture

```
Telegram Cloud <-> Electron Main Process <-> SQLite DB <-> IPC Bridge <-> React UI
```

- **Telegram Cloud** — Stores all file contents and the synced database document
- **Electron Main Process** — Manages the Telegram client (GramJS), SQLite database, HTTP stream server, and IPC handlers
- **SQLite DB** — Local cache/index of all file metadata (names, types, sizes, thumbnails, folder hierarchy)
- **IPC Bridge** — Secure contextBridge exposing typed APIs to the renderer
- **React UI** — shadcn/ui components with Tailwind CSS v4, responsive grid/list layouts

### Data Flow

1. **Upload**: React -> IPC -> upload to Telegram -> add to SQLite -> sync DB to Telegram
2. **Download**: React -> IPC -> fetch from Telegram -> save to disk
3. **Browse**: React -> IPC -> SQLite query -> return items -> render grid/list
4. **Stream**: React -> IPC -> get HTTP stream URL -> HTML5 video element requests `http://localhost:PORT/stream/{messageId}` -> main process fetches chunks from Telegram with Range support
5. **Sync**: SQLite exported as buffer -> uploaded to Telegram as a document -> downloaded on other devices -> imported back into SQLite

---

## License

MIT License — see [LICENSE](LICENSE)

Copyright (c) 2026 elgenawi
