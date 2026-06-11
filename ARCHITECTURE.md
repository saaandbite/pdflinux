# Arsitektur dan Tech Stack Aplikasi PDF Tools

Dokumen ini mendefinisikan teknologi yang digunakan (Tech Stack) dan struktur direktori untuk aplikasi PDF Tools di Linux.

## 🛠 Rekomendasi Tech Stack

Untuk membuat aplikasi desktop yang ringan, cepat, dan berjalan optimal di Linux, rekomendasi terbaik saat ini adalah kombinasi **Tauri** (sebagai framework desktop) dan **React** (sebagai antarmuka pengguna).

1. **Core Framework: Tauri**
   * **Kenapa Tauri?** Dibandingkan dengan Electron, Tauri menggunakan *webview* bawaan dari sistem operasi (WebKitGTK di Linux). Ini membuat aplikasi jauh lebih ringan (ukuran binary kecil) dan menggunakan RAM yang jauh lebih sedikit, sangat cocok untuk tool produktivitas.
   * **Bahasa Backend:** Rust (digunakan oleh Tauri untuk berinteraksi dengan sistem OS dan memproses file PDF dengan performa tinggi).

2. **Frontend (UI/UX): React.js + TypeScript + Vite**
   * **React:** Memudahkan pembuatan komponen UI interaktif seperti fitur *Drag & Drop* untuk file PDF.
   * **Vite:** Build tool yang sangat cepat untuk environment development.
   * **Styling:** CSS Modules atau Tailwind CSS untuk mendesain UI yang modern, *sleek* (dark mode), dan responsif.

3. **PDF Processing Engine:**
   * **Ghostscript (`gs`):** Tool Linux standar industri yang sangat andal untuk fitur **PDF Compress**. Tauri (via Rust) dapat memanggil `ghostscript` secara native.
   * **Poppler-utils (`pdfinfo`, `pdftoppm`):** Berguna untuk menampilkan preview PDF, konversi PDF ke Gambar.
   * **QPDF / pdf-lib (JS) / lopdf (Rust):** Untuk fitur *Merge*, *Split*, rotasi halaman, dan enkripsi/dekripsi password file PDF.

---

## 📂 Struktur Direktori Aplikasi (Tauri + React)

Aplikasi ini akan dibagi menjadi dua bagian utama: `src` (Frontend browser) dan `src-tauri` (Backend native Rust).

```text
pdf-tools-app/
├── package.json               # Dependensi Node.js / React
├── vite.config.ts             # Konfigurasi bundler frontend
├── src/                       # 🎨 FRONTEND CODE (React + TS)
│   ├── assets/                # Gambar, ikon, font
│   ├── components/            # Komponen UI global (Button, Sidebar, Dropzone)
│   ├── layouts/               # Layout aplikasi utama (Sidebar + Main Area)
│   ├── pages/                 # Halaman untuk masing-masing tool
│   │   ├── Dashboard.tsx      # Beranda daftar tools
│   │   ├── PdfCompress.tsx    # Halaman Kompres PDF
│   │   ├── PdfMerge.tsx       # Halaman Gabung beberapa PDF
│   │   └── PdfSplit.tsx       # Halaman Pisah Halaman PDF
│   ├── utils/                 # Fungsi bantuan frontend
│   ├── App.tsx                # Konfigurasi Routing (React Router)
│   └── main.tsx               # Entry point React
│
└── src-tauri/                 # ⚙️ BACKEND CODE (Rust)
    ├── Cargo.toml             # Dependensi Rust (misal: lopdf, tauri)
    ├── tauri.conf.json        # Konfigurasi window & build Tauri
    ├── icons/                 # Logo aplikasi untuk .deb / AppImage
    └── src/
        ├── main.rs            # Entry point backend Tauri
        └── pdf_engine.rs      # Logika native untuk memproses file PDF (panggil GS/QPDF)
```
