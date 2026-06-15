use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::{Mutex, OnceLock};

// Serialize heavy PDF operations so only one runs at a time, preventing RAM spikes.
static PDF_OP_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn pdf_lock() -> std::sync::MutexGuard<'static, ()> {
    PDF_OP_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

// ===== Result Types =====

#[derive(Serialize, Clone)]
pub struct CompressResult {
    pub original_size: u64,
    pub compressed_size: u64,
    pub output_path: String,
}

#[derive(Serialize, Clone)]
pub struct MergeResult {
    pub file_count: usize,
    pub output_path: String,
    pub output_size: u64,
}

#[derive(Serialize, Clone)]
pub struct SplitResult {
    pub output_path: String,
    pub page_count: usize,
}

#[derive(Serialize, Clone)]
pub struct ToImageResult {
    pub output_dir: String,
    pub image_count: usize,
    pub format: String,
}

#[derive(Serialize, Clone)]
pub struct ProtectResult {
    pub output_path: String,
    pub output_size: u64,
}

#[derive(Serialize, Clone)]
pub struct RotateResult {
    pub output_path: String,
    pub output_size: u64,
}

#[derive(Serialize, Clone)]
pub struct UnlockResult {
    pub output_path: String,
    pub output_size: u64,
}

#[derive(Serialize, Clone)]
pub struct WatermarkResult {
    pub output_path: String,
    pub output_size: u64,
}

#[derive(Serialize, Clone)]
pub struct ImageToPdfResult {
    pub output_path: String,
    pub output_size: u64,
    pub image_count: usize,
}

#[derive(Serialize, Clone)]
pub struct CropResult {
    pub output_path: String,
    pub output_size: u64,
}

#[derive(Serialize, Clone)]
pub struct PdfMetadata {
    pub title: String,
    pub author: String,
    pub pages: String,
    pub file_size: String,
    pub pdf_version: String,
    pub creator: String,
    pub producer: String,
    pub page_size: String,
    pub encrypted: String,
}

// ===== Compress =====

#[tauri::command]
pub async fn compress_pdf(input_path: String, output_path: String, quality: String) -> Result<CompressResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let original_size = fs::metadata(&input_path)
            .map_err(|e| format!("Gagal membaca file: {}", e))?
            .len();

        let pdf_setting = match quality.as_str() {
            "high" => "/prepress",
            "medium" => "/ebook",
            "low" => "/screen",
            _ => "/ebook",
        };

        let output = Command::new("gs")
            .args([
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                &format!("-dPDFSETTINGS={}", pdf_setting),
                "-dNOPAUSE", "-dQUIET", "-dBATCH",
                &format!("-sOutputFile={}", output_path),
                &input_path,
            ])
            .output()
            .map_err(|e| format!("Gagal menjalankan Ghostscript: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Ghostscript error: {}", stderr));
        }

        let compressed_size = fs::metadata(&output_path)
            .map_err(|e| format!("Gagal membaca file output: {}", e))?
            .len();

        Ok(CompressResult { original_size, compressed_size, output_path })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Merge =====

#[tauri::command]
pub async fn merge_pdf(input_paths: Vec<String>, output_path: String) -> Result<MergeResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        if input_paths.len() < 2 {
            return Err("Minimal 2 file PDF diperlukan.".to_string());
        }

        let mut args = vec!["--empty".to_string(), "--pages".to_string()];
        for path in &input_paths { args.push(path.clone()); }
        args.push("--".to_string());
        args.push(output_path.clone());

        let output = Command::new("qpdf").args(&args).output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            return Err(format!("qpdf error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Gagal membaca output: {}", e))?.len();

        Ok(MergeResult { file_count: input_paths.len(), output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Split =====

#[tauri::command]
pub async fn split_pdf(input_path: String, output_path: String, page_range: String) -> Result<SplitResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let output = Command::new("qpdf")
            .args([&input_path, "--pages", &input_path, &page_range, "--", &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            return Err(format!("qpdf error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let pc = Command::new("qpdf").args(["--show-npages", &output_path]).output()
            .map_err(|e| format!("Error: {}", e))?;
        let page_count: usize = String::from_utf8_lossy(&pc.stdout).trim().parse().unwrap_or(0);

        Ok(SplitResult { output_path, page_count })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== PDF to Image =====

#[tauri::command]
pub async fn pdf_to_image(input_path: String, output_dir: String, format: String) -> Result<ToImageResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        fs::create_dir_all(&output_dir)
            .map_err(|e| format!("Gagal membuat direktori: {}", e))?;

        let output_prefix = format!("{}/page", output_dir);
        let format_flag = if format == "jpg" || format == "jpeg" { "-jpeg" } else { "-png" };

        let output = Command::new("pdftoppm")
            .args([format_flag, "-r", "300", &input_path, &output_prefix])
            .output()
            .map_err(|e| format!("Gagal menjalankan pdftoppm: {}", e))?;

        if !output.status.success() {
            return Err(format!("pdftoppm error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let ext = if format == "jpg" || format == "jpeg" { "jpg" } else { "png" };
        let image_count = fs::read_dir(&output_dir).map_err(|e| format!("Error: {}", e))?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map(|x| x.to_string_lossy().to_lowercase() == ext).unwrap_or(false))
            .count();

        Ok(ToImageResult { output_dir, image_count, format: ext.to_string() })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Protect =====

#[tauri::command]
pub async fn protect_pdf(input_path: String, output_path: String, password: String) -> Result<ProtectResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let output = Command::new("qpdf")
            .args(["--encrypt", &password, &password, "256", "--", &input_path, &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            return Err(format!("qpdf error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Error: {}", e))?.len();

        Ok(ProtectResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Rotate =====

#[tauri::command]
pub async fn rotate_pdf(input_path: String, output_path: String, angle: String, pages: String) -> Result<RotateResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let rotation = format!("+{}", angle);
        let page_spec = if pages.is_empty() || pages == "all" { "1-z".to_string() } else { pages };
        let rotate_arg = format!("--rotate={}:{}", rotation, page_spec);

        let output = Command::new("qpdf")
            .args([&rotate_arg, &input_path, &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            return Err(format!("qpdf error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Error: {}", e))?.len();

        Ok(RotateResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Unlock =====

#[tauri::command]
pub async fn unlock_pdf(input_path: String, output_path: String, password: String) -> Result<UnlockResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let output = Command::new("qpdf")
            .args(["--decrypt", &format!("--password={}", password), &input_path, &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("invalid password") {
                return Err("Password salah. Silakan coba lagi.".to_string());
            }
            return Err(format!("qpdf error: {}", stderr));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Error: {}", e))?.len();

        Ok(UnlockResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Watermark =====

#[tauri::command]
pub async fn watermark_pdf(input_path: String, output_path: String, text: String) -> Result<WatermarkResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let temp_dir = std::env::temp_dir().join("pdf-tools");
        fs::create_dir_all(&temp_dir).ok();
        let ps_path = temp_dir.join("watermark.ps");

        let ps_content = format!(
            r#"<<
  /EndPage {{
    2 eq {{ pop false }}
    {{
      gsave
      /Helvetica-Bold findfont 60 scalefont setfont
      0.85 setgray
      306 396 translate
      45 rotate
      0 0 moveto
      ({}) dup stringwidth pop -2 div -20 rmoveto show
      grestore
      true
    }} ifelse
  }} bind
>> setpagedevice"#,
            text
        );

        fs::write(&ps_path, &ps_content)
            .map_err(|e| format!("Gagal menulis watermark script: {}", e))?;

        let output = Command::new("gs")
            .args([
                "-sDEVICE=pdfwrite",
                "-dNOPAUSE", "-dQUIET", "-dBATCH",
                &format!("-sOutputFile={}", output_path),
                &ps_path.to_string_lossy(),
                &input_path,
            ])
            .output()
            .map_err(|e| format!("Gagal menjalankan Ghostscript: {}", e))?;

        fs::remove_file(&ps_path).ok();

        if !output.status.success() {
            return Err(format!("Ghostscript error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Error: {}", e))?.len();

        Ok(WatermarkResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Image to PDF =====

#[tauri::command]
pub async fn image_to_pdf(input_paths: Vec<String>, output_path: String) -> Result<ImageToPdfResult, String> {
    let image_count = input_paths.len();
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let mut args = vec![
            "-sDEVICE=pdfwrite".to_string(),
            "-dNOPAUSE".to_string(),
            "-dQUIET".to_string(),
            "-dBATCH".to_string(),
            format!("-sOutputFile={}", output_path),
        ];
        args.extend(input_paths);

        let output = Command::new("gs")
            .args(&args)
            .output()
            .map_err(|e| format!("Gagal menjalankan Ghostscript: {}", e))?;

        if !output.status.success() {
            return Err(format!("Ghostscript error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Error: {}", e))?.len();

        Ok(ImageToPdfResult { output_path, output_size, image_count })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== PDF Metadata =====

#[tauri::command]
pub async fn get_pdf_metadata(input_path: String) -> Result<PdfMetadata, String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("pdfinfo")
            .arg(&input_path)
            .output()
            .map_err(|e| format!("Gagal menjalankan pdfinfo: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let get_field = |field: &str| -> String {
            stdout.lines()
                .find(|l| l.starts_with(field))
                .map(|l| l[field.len()..].trim().to_string())
                .unwrap_or_else(|| "-".to_string())
        };

        let file_size = fs::metadata(&input_path)
            .map(|m| {
                let s = m.len();
                if s < 1048576 { format!("{:.1} KB", s as f64 / 1024.0) }
                else { format!("{:.2} MB", s as f64 / 1048576.0) }
            })
            .unwrap_or_else(|_| "-".to_string());

        Ok(PdfMetadata {
            title: get_field("Title:"),
            author: get_field("Author:"),
            pages: get_field("Pages:"),
            file_size,
            pdf_version: get_field("PDF version:"),
            creator: get_field("Creator:"),
            producer: get_field("Producer:"),
            page_size: get_field("Page size:"),
            encrypted: get_field("Encrypted:"),
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Utility =====

#[tauri::command]
pub async fn get_pdf_info(input_path: String) -> Result<u64, String> {
    tokio::task::spawn_blocking(move || {
        fs::metadata(&input_path)
            .map_err(|e| format!("Gagal membaca file: {}", e))
            .map(|m| m.len())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn get_temp_dir() -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("pdf-tools");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Gagal membuat temp dir: {}", e))?;
    Ok(temp_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_file_to(source: String, destination: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        if let Some(parent) = Path::new(&destination).parent() {
            fs::create_dir_all(parent).ok();
        }
        fs::copy(&source, &destination)
            .map_err(|e| format!("Gagal menyalin file: {}", e))?;
        Ok(destination)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Crop =====

#[tauri::command]
pub async fn crop_pdf(
    input_path: String,
    output_path: String,
    top: f64,
    bottom: f64,
    left: f64,
    right: f64,
) -> Result<CropResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let mm2pt = 2.83465;
        let t = top * mm2pt;
        let b = bottom * mm2pt;
        let l = left * mm2pt;
        let r = right * mm2pt;

        let info_out = Command::new("pdfinfo").arg(&input_path).output()
            .map_err(|e| format!("Gagal menjalankan pdfinfo: {}", e))?;
        let info_str = String::from_utf8_lossy(&info_out.stdout);

        let (page_w, page_h) = info_str.lines()
            .find(|l| l.starts_with("Page size:"))
            .and_then(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 5 {
                    let w: f64 = parts[2].parse().unwrap_or(612.0);
                    let h: f64 = parts[4].parse().unwrap_or(792.0);
                    Some((w, h))
                } else { None }
            })
            .unwrap_or((612.0, 792.0));

        let crop_left = l;
        let crop_bottom = b;
        let crop_right = page_w - r;
        let crop_top = page_h - t;

        if crop_right <= crop_left || crop_top <= crop_bottom {
            return Err("Margin terlalu besar — area crop tidak valid.".to_string());
        }

        let gs_script = format!(
            "<< /CurPt [0 0] >> begin \n\
             << /EndPage {{ \n\
               exch pop 0 eq {{ \n\
                 [{} {} {} {}] /CropBox pdfmark true \n\
               }} {{ false }} ifelse \n\
             }} bind >> setpagedevice",
            crop_left, crop_bottom, crop_right, crop_top
        );

        let output = Command::new("gs")
            .args([
                "-sDEVICE=pdfwrite",
                "-dNOPAUSE", "-dQUIET", "-dBATCH",
                &format!("-sOutputFile={}", output_path),
                "-c", &gs_script,
                "-f", &input_path,
            ])
            .output()
            .map_err(|e| format!("Gagal menjalankan Ghostscript: {}", e))?;

        if !output.status.success() {
            return Err(format!("Ghostscript error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path)
            .map_err(|e| format!("Error: {}", e))?.len();

        Ok(CropResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Helper: parse "1,3,5-8" → HashSet<usize> =====

fn parse_page_set(range_str: &str, total: usize) -> Result<std::collections::HashSet<usize>, String> {
    let mut pages = std::collections::HashSet::new();
    for part in range_str.split(',') {
        let part = part.trim();
        if part.is_empty() { continue; }
        if let Some((s, e)) = part.split_once('-') {
            let start: usize = s.trim().parse()
                .map_err(|_| format!("Nomor tidak valid: '{}'", s.trim()))?;
            let end: usize = e.trim().parse()
                .map_err(|_| format!("Nomor tidak valid: '{}'", e.trim()))?;
            if start < 1 || end > total || start > end {
                return Err(format!("Rentang tidak valid: {}-{} (total halaman: {})", start, end, total));
            }
            for p in start..=end { pages.insert(p); }
        } else {
            let p: usize = part.parse()
                .map_err(|_| format!("Nomor halaman tidak valid: '{}'", part))?;
            if p < 1 || p > total {
                return Err(format!("Halaman {} tidak ada (total: {})", p, total));
            }
            pages.insert(p);
        }
    }
    Ok(pages)
}

// ===== Helper: [1,2,4,5,6] → "1-2,4-6" =====

fn vec_to_range_string(pages: &[usize]) -> String {
    if pages.is_empty() { return String::new(); }
    let mut result: Vec<String> = Vec::new();
    let mut start = pages[0];
    let mut end = pages[0];
    for &p in &pages[1..] {
        if p == end + 1 { end = p; }
        else {
            if start == end { result.push(start.to_string()); }
            else { result.push(format!("{}-{}", start, end)); }
            start = p; end = p;
        }
    }
    if start == end { result.push(start.to_string()); }
    else { result.push(format!("{}-{}", start, end)); }
    result.join(",")
}

// ===== Delete Pages =====

#[derive(Serialize, Clone)]
pub struct DeletePagesResult {
    pub output_path: String,
    pub output_size: u64,
    pub pages_deleted: usize,
    pub pages_remaining: usize,
}

#[tauri::command]
pub async fn delete_pages(
    input_path: String,
    output_path: String,
    pages_to_delete: String,
) -> Result<DeletePagesResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let pc_out = Command::new("qpdf")
            .args(["--show-npages", &input_path])
            .output()
            .map_err(|e| format!("Gagal membaca halaman: {}", e))?;
        let total: usize = String::from_utf8_lossy(&pc_out.stdout)
            .trim().parse()
            .map_err(|_| "Gagal membaca jumlah halaman.".to_string())?;

        let to_delete = parse_page_set(&pages_to_delete, total)?;
        if to_delete.is_empty() {
            return Err("Tidak ada halaman yang dipilih untuk dihapus.".to_string());
        }

        let mut to_keep: Vec<usize> = (1..=total).filter(|p| !to_delete.contains(p)).collect();
        to_keep.sort_unstable();

        if to_keep.is_empty() {
            return Err("Tidak bisa menghapus semua halaman.".to_string());
        }

        let keep_range = vec_to_range_string(&to_keep);
        let output = Command::new("qpdf")
            .args([&input_path, "--pages", &input_path, &keep_range, "--", &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            return Err(format!("qpdf error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path).map_err(|e| format!("Error: {}", e))?.len();
        Ok(DeletePagesResult {
            output_path,
            output_size,
            pages_deleted: to_delete.len(),
            pages_remaining: to_keep.len(),
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Reorder Pages =====

#[derive(Serialize, Clone)]
pub struct ReorderResult {
    pub output_path: String,
    pub output_size: u64,
    pub page_count: usize,
}

#[tauri::command]
pub async fn reorder_pages(
    input_path: String,
    output_path: String,
    page_order: String,
) -> Result<ReorderResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let output = Command::new("qpdf")
            .args([&input_path, "--pages", &input_path, &page_order, "--", &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan qpdf: {}", e))?;

        if !output.status.success() {
            return Err(format!("qpdf error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let pc = Command::new("qpdf").args(["--show-npages", &output_path]).output()
            .map_err(|e| format!("Error: {}", e))?;
        let page_count: usize = String::from_utf8_lossy(&pc.stdout).trim().parse().unwrap_or(0);
        let output_size = fs::metadata(&output_path).map_err(|e| format!("Error: {}", e))?.len();

        Ok(ReorderResult { output_path, output_size, page_count })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Add Page Numbers =====

#[derive(Serialize, Clone)]
pub struct PageNumberResult {
    pub output_path: String,
    pub output_size: u64,
}

#[tauri::command]
pub async fn add_page_numbers(
    input_path: String,
    output_path: String,
    position: String,
    font_size: u32,
    start_number: u32,
) -> Result<PageNumberResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let info = Command::new("pdfinfo").arg(&input_path).output()
            .map_err(|e| format!("Gagal membaca info PDF: {}", e))?;
        let info_str = String::from_utf8_lossy(&info.stdout);
        let (page_w, page_h) = info_str.lines()
            .find(|l| l.starts_with("Page size:"))
            .and_then(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 5 {
                    Some((parts[2].parse().unwrap_or(595.0_f64), parts[4].parse().unwrap_or(842.0_f64)))
                } else { None }
            })
            .unwrap_or((595.0, 842.0));

        let margin = 35.0_f64;
        let (tx, ty, align) = match position.as_str() {
            "bottom-left"  => (margin, margin, "left"),
            "bottom-right" => (page_w - margin, margin, "right"),
            "top-left"     => (margin, page_h - margin, "left"),
            "top-center"   => (page_w / 2.0, page_h - margin, "center"),
            "top-right"    => (page_w - margin, page_h - margin, "right"),
            _              => (page_w / 2.0, margin, "center"),
        };

        let show_cmd = match align {
            "center" => "dup stringwidth pop 2 div neg 0 rmoveto show",
            "right"  => "dup stringwidth pop neg 0 rmoveto show",
            _        => "show",
        };

        let ps_content = format!(
            r#"/pn {} def
<< /EndPage {{
  2 eq {{ pop false }} {{
    /pn pn 1 add def
    gsave
    /Helvetica findfont {} scalefont setfont
    0 setgray
    {} {} moveto
    pn 10 string cvs {}
    grestore
    pop true
  }} ifelse
}} bind >> setpagedevice"#,
            start_number - 1,
            font_size,
            tx, ty,
            show_cmd,
        );

        let temp_dir = std::env::temp_dir().join("pdf-tools");
        fs::create_dir_all(&temp_dir).ok();
        let ps_path = temp_dir.join("pagenum.ps");
        fs::write(&ps_path, &ps_content)
            .map_err(|e| format!("Gagal menulis script: {}", e))?;

        let output = Command::new("gs")
            .args([
                "-sDEVICE=pdfwrite",
                "-dNOPAUSE", "-dQUIET", "-dBATCH",
                &format!("-sOutputFile={}", output_path),
                &ps_path.to_string_lossy(),
                &input_path,
            ])
            .output()
            .map_err(|e| format!("Gagal menjalankan Ghostscript: {}", e))?;

        fs::remove_file(&ps_path).ok();

        if !output.status.success() {
            return Err(format!("Ghostscript error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path).map_err(|e| format!("Error: {}", e))?.len();
        Ok(PageNumberResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== PDF to Text =====

#[derive(Serialize, Clone)]
pub struct PdfToTextResult {
    pub output_path: String,
    pub output_size: u64,
    pub char_count: usize,
}

#[tauri::command]
pub async fn pdf_to_text(input_path: String, output_path: String) -> Result<PdfToTextResult, String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("pdftotext")
            .args(["-layout", &input_path, &output_path])
            .output()
            .map_err(|e| format!("Gagal menjalankan pdftotext: {}", e))?;

        if !output.status.success() {
            return Err(format!("pdftotext error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let char_count = fs::read_to_string(&output_path)
            .map(|s| s.chars().count())
            .unwrap_or(0);
        let output_size = fs::metadata(&output_path).map_err(|e| format!("Error: {}", e))?.len();
        Ok(PdfToTextResult { output_path, output_size, char_count })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== Grayscale =====

#[derive(Serialize, Clone)]
pub struct GrayscaleResult {
    pub output_path: String,
    pub output_size: u64,
}

#[tauri::command]
pub async fn grayscale_pdf(input_path: String, output_path: String) -> Result<GrayscaleResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let output = Command::new("gs")
            .args([
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-sColorConversionStrategy=Gray",
                "-dProcessColorModel=/DeviceGray",
                "-dNOPAUSE", "-dQUIET", "-dBATCH",
                &format!("-sOutputFile={}", output_path),
                &input_path,
            ])
            .output()
            .map_err(|e| format!("Gagal menjalankan Ghostscript: {}", e))?;

        if !output.status.success() {
            return Err(format!("Ghostscript error: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let output_size = fs::metadata(&output_path).map_err(|e| format!("Error: {}", e))?.len();
        Ok(GrayscaleResult { output_path, output_size })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

// ===== OCR =====

#[derive(Serialize, Clone)]
pub struct OcrResult {
    pub output_path: String,
    pub output_size: u64,
    pub page_count: usize,
}

#[tauri::command]
pub async fn ocr_pdf(input_path: String, output_path: String, language: String) -> Result<OcrResult, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = pdf_lock();

        let work_dir = std::env::temp_dir().join("pdf-tools").join("ocr_work");
        fs::create_dir_all(&work_dir).map_err(|e| format!("Gagal membuat dir: {}", e))?;

        // Step 1: extract pages as images (200 DPI is enough for OCR and saves RAM)
        let prefix = work_dir.join("page").to_string_lossy().to_string();
        let extract = Command::new("pdftoppm")
            .args(["-png", "-r", "200", &input_path, &prefix])
            .output()
            .map_err(|e| format!("Gagal mengekstrak halaman: {}", e))?;

        if !extract.status.success() {
            let _ = fs::remove_dir_all(&work_dir);
            return Err(format!("pdftoppm error: {}", String::from_utf8_lossy(&extract.stderr)));
        }

        // Collect and sort image files
        let mut images: Vec<std::path::PathBuf> = fs::read_dir(&work_dir)
            .map_err(|e| format!("Error: {}", e))?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map(|x| x == "png").unwrap_or(false))
            .map(|e| e.path())
            .collect();
        images.sort();

        if images.is_empty() {
            let _ = fs::remove_dir_all(&work_dir);
            return Err("Tidak ada halaman yang diekstrak.".to_string());
        }

        // Step 2: OCR each image
        let lang = if language.is_empty() { "eng".to_string() } else { language };
        let mut ocr_pdfs: Vec<String> = Vec::new();

        for (i, img_path) in images.iter().enumerate() {
            let ocr_base = work_dir.join(format!("ocr_{:04}", i));
            let result = Command::new("tesseract")
                .args([
                    &img_path.to_string_lossy().to_string(),
                    &ocr_base.to_string_lossy().to_string(),
                    "-l", &lang,
                    "pdf",
                ])
                .output()
                .map_err(|e| format!("Gagal menjalankan tesseract: {}", e))?;

            if !result.status.success() {
                let _ = fs::remove_dir_all(&work_dir);
                return Err(format!("Tesseract error halaman {}: {}", i + 1, String::from_utf8_lossy(&result.stderr)));
            }

            ocr_pdfs.push(format!("{}.pdf", ocr_base.to_string_lossy()));
        }

        let page_count = ocr_pdfs.len();

        // Step 3: merge all OCR PDFs into one
        if page_count == 1 {
            fs::copy(&ocr_pdfs[0], &output_path)
                .map_err(|e| format!("Gagal menyalin: {}", e))?;
        } else {
            let mut args = vec!["--empty".to_string(), "--pages".to_string()];
            for p in &ocr_pdfs { args.push(p.clone()); }
            args.push("--".to_string());
            args.push(output_path.clone());

            let merge = Command::new("qpdf").args(&args).output()
                .map_err(|e| format!("Gagal menggabungkan hasil OCR: {}", e))?;

            if !merge.status.success() {
                let _ = fs::remove_dir_all(&work_dir);
                return Err(format!("qpdf error: {}", String::from_utf8_lossy(&merge.stderr)));
            }
        }

        let _ = fs::remove_dir_all(&work_dir);
        let output_size = fs::metadata(&output_path).map_err(|e| format!("Error: {}", e))?.len();
        Ok(OcrResult { output_path, output_size, page_count })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn cleanup_temp() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        let temp_dir = std::env::temp_dir().join("pdf-tools");
        if temp_dir.exists() {
            let mut count = 0u32;
            if let Ok(entries) = fs::read_dir(&temp_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        fs::remove_file(&path).ok();
                        count += 1;
                    } else if path.is_dir() {
                        fs::remove_dir_all(&path).ok();
                        count += 1;
                    }
                }
            }
            Ok(format!("{} file/folder temp dihapus.", count))
        } else {
            Ok("Tidak ada file temp.".to_string())
        }
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}
