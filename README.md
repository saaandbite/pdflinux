# PDF Tools

> **100% Free. No subscription. No account. Your files never leave your computer.**

A fast, privacy-first desktop application for all your everyday PDF tasks. Built with Tauri + Rust on the backend and React + TypeScript on the frontend, PDF Tools runs entirely on your local machine — no internet connection required, no data uploaded anywhere.

---

## Why PDF Tools?

Most online PDF tools require you to upload your files to a remote server. For sensitive documents — contracts, medical records, personal IDs — that's a real risk. PDF Tools processes everything **on your machine**, in memory or in your local filesystem, so your documents stay private.

- **Free forever** — no freemium, no trial, no subscription
- **Privacy-first** — zero network requests, zero telemetry
- **Lightweight** — powered by Tauri (uses the OS native webview, not a bundled Chromium like Electron)
- **Cross-platform** — Linux primary target; Windows and macOS supported via Tauri

---

## Features

| Tool | Description |
|---|---|
| **Compress** | Reduce PDF file size using Ghostscript with quality presets |
| **Merge** | Combine multiple PDFs into one, with drag-to-reorder support |
| **Split** | Extract a range of pages (e.g. `1-5, 8, 11-15`) into separate files |
| **PDF to Image** | Export every page to PNG or JPG via Poppler |
| **Image to PDF** | Bundle one or more images into a single PDF |
| **Protect** | Encrypt a PDF with a password (QPDF) |
| **Unlock** | Remove password protection from a PDF |
| **Rotate** | Rotate pages by 90°, 180°, or 270° |
| **Watermark** | Stamp text or image watermarks on pages |
| **Crop** | Trim page margins to a custom crop box |
| **Delete Pages** | Remove specific pages from a document |
| **Reorder Pages** | Drag and drop pages into a new order |
| **Add Page Numbers** | Stamp page numbers onto every page |
| **PDF to Text** | Extract plain text content from a PDF |
| **Grayscale** | Convert a color PDF to black and white |
| **OCR** | Run optical character recognition on scanned pages |
| **PDF Info** | Inspect metadata: page count, dimensions, title, author |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app/) |
| Backend / PDF engine | Rust + Ghostscript + Poppler + QPDF |
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| Styling | Vanilla CSS with dark/light mode |

### Why Tauri instead of Electron?

Tauri uses the operating system's native webview (WebKitGTK on Linux) instead of bundling a full Chromium engine. The result is a binary that is **10–20× smaller** and uses a fraction of the RAM compared to equivalent Electron apps.

---

## Prerequisites

Make sure the following tools are installed on your system. These are the native CLI utilities that power the PDF processing features.

**On Debian / Ubuntu:**
```bash
sudo apt install ghostscript poppler-utils qpdf tesseract-ocr
```

**On Fedora:**
```bash
sudo dnf install ghostscript poppler-utils qpdf tesseract
```

**On Arch Linux:**
```bash
sudo pacman -S ghostscript poppler qpdf tesseract
```

You also need the Rust toolchain and Node.js to build the app from source:

- [Rust](https://rustup.rs/) (minimum version 1.77.2)
- [Node.js](https://nodejs.org/) (LTS recommended)
- Tauri system dependencies — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/pdf-tools.git
cd pdf-tools
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run tauri dev
```

This command starts the Vite dev server and the Tauri native shell together. The app window will open automatically.

### 4. Build a production binary

```bash
npm run tauri build
```

Output installers are placed in `src-tauri/target/release/bundle/`:

| Format | Description |
|---|---|
| `.deb` | Debian / Ubuntu package |
| `AppImage` | Portable, runs on any Linux distro |

---

## Project Structure

```
pdf-tools/
├── src/                        # React frontend (TypeScript)
│   ├── components/             # Shared UI components (Sidebar, Dropzone, etc.)
│   ├── pages/                  # One file per PDF tool
│   ├── hooks/                  # Custom React hooks (e.g. useTheme)
│   ├── App.tsx                 # Route definitions
│   └── main.tsx                # React entry point
│
└── src-tauri/                  # Rust backend (Tauri)
    ├── src/
    │   ├── main.rs             # Tauri entry point
    │   └── pdf_engine.rs       # PDF processing logic (calls gs, qpdf, poppler)
    ├── tauri.conf.json         # App window and build configuration
    └── Cargo.toml              # Rust dependencies
```

---

## Contributing

Contributions are welcome. If you find a bug or want to add a feature:

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push and open a Pull Request

Please open an issue first for larger changes so we can discuss the approach.

---

## License

This project is open source. See [LICENSE](./LICENSE) for details.

---

## Privacy

PDF Tools does not collect any data. It makes no network requests. All processing happens locally using the CLI tools installed on your system (Ghostscript, Poppler, QPDF, Tesseract). Your documents are never uploaded, logged, or shared.
