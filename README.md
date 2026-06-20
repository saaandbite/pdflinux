# PDF & Chips

[![npm version](https://img.shields.io/npm/v/pdf-chips.svg)](https://www.npmjs.com/package/pdf-chips)
[![npm downloads](https://img.shields.io/npm/dm/pdf-chips.svg)](https://www.npmjs.com/package/pdf-chips)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey.svg)](#install)

> **100% free. No subscription. No account. Your files never leave your computer.**

A fast, privacy-first desktop application for all your everyday PDF tasks. Built with Tauri + Rust on the backend and React + TypeScript on the frontend — runs entirely on your local machine, no internet connection required, no files uploaded anywhere.

---

## Table of Contents

- [Quick Install](#quick-install)
- [Why PDF & Chips?](#why-pdf--chips)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Linux](#linux)
  - [Windows](#windows)
  - [macOS](#macos)
- [Update & Uninstall](#update--uninstall)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Privacy](#privacy)

---

## Quick Install

### Linux / macOS
```bash
npx pdf-chips
```

### Windows
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Or if you have Node.js installed:
```bash
npx pdf-chips
```

That's it. The installer detects your OS, installs all dependencies, downloads the pre-built release (or builds from source), and adds it to your application menu / Start Menu.

---

## Why PDF & Chips?

Most online PDF tools require you to upload your files to their servers. For sensitive documents — contracts, medical records, IDs — that's a real risk. PDF & Chips processes everything **on your machine**, with no internet connection and no uploads anywhere.

- **Free forever** — no freemium, no trial, no subscription
- **Privacy-first** — zero network requests, zero telemetry
- **Lightweight** — powered by Tauri (uses the OS native webview, not a bundled Chromium like Electron)
- **Cross-platform** — Linux, Windows, and macOS
- **Open source** — auditable, forkable, yours

---

## Features

17 PDF tools, all running locally on your machine:

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

## Prerequisites

PDF & Chips relies on a few native CLI utilities for PDF processing. The installer will attempt to install these automatically.

| Tool | Used for | Linux | Windows | macOS |
|---|---|---|---|---|
| **Ghostscript** | Compress, Watermark, Page Numbers, Grayscale | `apt/dnf/pacman` | `winget` | `brew` |
| **Poppler** (`pdfinfo`, `pdftoppm`, `pdftotext`) | PDF info, preview, text extraction | `apt/dnf/pacman` | [release zip](https://github.com/oschwartz10612/poppler-windows/releases) | `brew` |
| **QPDF** | Merge, Split, Encrypt, Decrypt, Reorder | `apt/dnf/pacman` | `winget` | `brew` |
| **Tesseract** | OCR | `apt/dnf/pacman` | `winget` | `brew` |

> On **Windows** the tools must be on your system `PATH`. The installer gives step-by-step instructions if any are missing.

---

## Installation

### Linux

#### Option 1 — npx (easiest)
```bash
npx pdf-chips
```

#### Option 2 — Git Clone
```bash
git clone https://github.com/saaandbite/pdfchips.git
cd pdfchips
./install.sh
```

The `install.sh` script will automatically:
- Detect your distro (Debian/Ubuntu, Fedora/RHEL/CentOS, Arch, etc.)
- Install all required dependencies
- Download the pre-built package or build from source
- Install `.deb` / `.rpm` / `AppImage` for your distro
- Add a shortcut to your app menu and a `pdf-chips` command in the terminal

To uninstall:
```bash
./uninstall.sh
```

### Windows

#### Option 1 — npx (easiest, requires Node.js)
```bash
npx pdf-chips
```
The installer auto-detects Windows and downloads the NSIS `.exe` setup wizard.

#### Option 2 — PowerShell script
```powershell
git clone https://github.com/saaandbite/pdfchips.git
cd pdfchips
powershell -ExecutionPolicy Bypass -File install.ps1
```

The `install.ps1` script will:
1. Install Ghostscript, QPDF, and Tesseract via `winget` (if available)
2. Guide you to install Poppler manually if needed
3. Download the pre-built `.exe` installer from GitHub Releases (or build from source)
4. Launch the NSIS setup wizard

> **Note on CLI tools:** PDF & Chips on Windows calls `gs.exe`, `qpdf.exe`, `pdfinfo.exe`, `pdftoppm.exe`, and `tesseract.exe`. Make sure these are on your `PATH` for all features to work.

### macOS

#### Option 1 — npx (easiest)
```bash
npx pdf-chips
```

#### Option 2 — Git Clone
```bash
git clone https://github.com/saaandbite/pdfchips.git
cd pdfchips
brew install ghostscript poppler qpdf tesseract
./install.sh
```

> macOS produces a `.dmg` bundle via `npm run tauri build`.

### Launching the app

After installation:
- **Linux** — search for "PDF & Chips" in your desktop launcher, or run `pdf-chips` in the terminal
- **Windows** — search for "PDF & Chips" in the Start Menu
- **macOS** — open from Applications or Spotlight

---

## Update & Uninstall

### Check installed version
```bash
pdf-chips --version
```

### Update to the latest version
```bash
npx pdf-chips@latest
```

### Uninstall (Linux/macOS)
```bash
npx pdf-chips uninstall
```
Or from a git clone:
```bash
./uninstall.sh
```

### Uninstall (Windows)
Use **Add or Remove Programs** → search for "PDF & Chips" → Uninstall.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app/) |
| Backend / PDF engine | Rust + Ghostscript + Poppler + QPDF |
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| Styling | Vanilla CSS with dark/light mode |
| Windows installer | NSIS (via Tauri bundle) |

### Why Tauri instead of Electron?

Tauri uses the operating system's native webview (WebKitGTK on Linux, WebView2 on Windows, WKWebView on macOS) instead of bundling a full Chromium engine. The result is a binary that is **10–20× smaller** and uses a fraction of the RAM compared to equivalent Electron apps.

---

## Development

To run from source for local development:

```bash
git clone https://github.com/saaandbite/pdfchips.git
cd pdfchips
npm install
npm run tauri dev
```

To build a production binary:

```bash
npm run tauri build
```

Output installers are placed in `src-tauri/target/release/bundle/`:

| Format | Platform |
|---|---|
| `.deb` | Debian / Ubuntu and derivatives |
| `.rpm` | Fedora / RHEL / CentOS and derivatives |
| `.AppImage` | Any Linux distro (portable) |
| `.exe` (NSIS) | Windows |
| `.dmg` | macOS |

---

## Project Structure

```
pdfchips/
├── src/                        # React frontend (TypeScript)
│   ├── components/             # Shared UI components (Sidebar, Dropzone, etc.)
│   ├── pages/                  # One file per PDF tool
│   ├── App.tsx                 # Route definitions
│   └── main.tsx                # React entry point
│
├── src-tauri/                  # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   └── pdf_engine.rs       # PDF processing logic (calls gs, qpdf, poppler)
│   ├── tauri.conf.json         # App window and build configuration
│   └── Cargo.toml              # Rust dependencies
│
├── bin/pdflinux                # npm CLI wrapper (cross-platform)
├── install.sh                  # Linux/macOS installer script
├── install.ps1                 # Windows PowerShell installer script
└── uninstall.sh                # Linux/macOS uninstaller script
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

This project is open source under the [MIT License](./LICENSE).

---

## Privacy

PDF & Chips does not collect any data. It makes no network requests. All processing happens locally using the CLI tools installed on your system (Ghostscript, Poppler, QPDF, Tesseract). Your documents are never uploaded, logged, or shared anywhere.
