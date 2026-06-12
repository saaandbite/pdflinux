# PDFLinux

[![npm version](https://img.shields.io/npm/v/pdflinux.svg)](https://www.npmjs.com/package/pdflinux)
[![npm downloads](https://img.shields.io/npm/dm/pdflinux.svg)](https://www.npmjs.com/package/pdflinux)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-linux-lightgrey.svg)](#install)

> **100% free. No subscription. No account. Your files never leave your computer.**

A fast, privacy-first desktop application for all your everyday PDF tasks. Built with Tauri + Rust on the backend and React + TypeScript on the frontend — runs entirely on your local machine, no internet connection required, no files uploaded anywhere.

---

## Table of Contents

- [Quick Install](#quick-install)
- [Why PDFLinux?](#why-pdflinux)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Update & Uninstall](#update--uninstall)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Privacy](#privacy)

---

## Quick Install

```bash
npx pdflinux
```

That's it. The installer detects your distro, installs all dependencies, builds the app, and adds it to your application menu.

---

## Why PDFLinux?

Most online PDF tools require you to upload your files to their servers. For sensitive documents — contracts, medical records, IDs — that's a real risk. PDFLinux processes everything **on your machine**, with no internet connection and no uploads anywhere.

- **Free forever** — no freemium, no trial, no subscription
- **Privacy-first** — zero network requests, zero telemetry
- **Lightweight** — powered by Tauri (uses the OS native webview, not a bundled Chromium like Electron)
- **Linux-first** — primary target is Linux; Windows and macOS are also supported via Tauri
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

PDFLinux requires a few native CLI utilities to do the heavy lifting. The installer will install these for you automatically, but here is the list for reference:

- **Ghostscript** — for compression and color operations
- **Poppler** — for PDF-to-image conversion and text extraction
- **QPDF** — for encryption, decryption, and page operations
- **Tesseract** — for OCR

The installer also requires:
- A supported Linux distro (Debian, Ubuntu, Fedora, RHEL, CentOS, Arch, openSUSE, or derivatives)
- `sudo` privileges (to install system packages)
- Internet access (during installation only)

---

## Installation

### Option 1 — npx (easiest)

If you already have Node.js installed:

```bash
npx pdflinux
```

To uninstall:
```bash
npx pdflinux uninstall
```

### Option 2 — Git Clone

```bash
git clone https://github.com/saaandbite/pdflinux.git
cd pdflinux
./install.sh
```

The `install.sh` script will automatically:
- Detect your distro (Debian/Ubuntu, Fedora/RHEL/CentOS, Arch, etc.)
- Install all required dependencies
- Build the application
- Install the appropriate package (`.deb` / `.rpm` / `AppImage`) for your distro
- Add a shortcut to your app menu and a `pdflinux` command in the terminal

To uninstall:
```bash
./uninstall.sh
```

### Launching the app

After installation you can launch PDFLinux in two ways:

- **Application menu** — search for "PDFLinux" in your desktop environment's app launcher
- **Terminal** — run `pdflinux` from anywhere

---

## Update & Uninstall

### Check installed version

```bash
pdflinux --version
```

### Update to the latest version

```bash
npx pdflinux@latest
```

The installer will rebuild and reinstall automatically, replacing the previous version.

To update to a specific version:

```bash
npx pdflinux@0.1.8
```

### Uninstall

```bash
npx pdflinux uninstall
```

Or if you installed via git clone:

```bash
./uninstall.sh
```

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

## Development

To run from source for local development:

```bash
git clone https://github.com/saaandbite/pdflinux.git
cd pdflinux
npm install
npm run tauri dev
```

To build a production binary:

```bash
npm run tauri build
```

Output installers are placed in `src-tauri/target/release/bundle/`:

| Format | Distro |
|---|---|
| `.deb` | Debian / Ubuntu and derivatives |
| `.rpm` | Fedora / RHEL / CentOS and derivatives |
| `.AppImage` | Any Linux distro (portable) |

---

## Project Structure

```
pdflinux/
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
├── bin/pdflinux                # npm CLI wrapper
├── install.sh                  # Linux installer script
└── uninstall.sh                # Linux uninstaller script
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

PDFLinux does not collect any data. It makes no network requests. All processing happens locally using the CLI tools installed on your system (Ghostscript, Poppler, QPDF, Tesseract). Your documents are never uploaded, logged, or shared anywhere.
