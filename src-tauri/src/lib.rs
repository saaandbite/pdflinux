mod pdf_engine;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|_window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        let temp_dir = std::env::temp_dir().join("pdf-tools");
        let _ = std::fs::remove_dir_all(temp_dir);
      }
    })
    .invoke_handler(tauri::generate_handler![
      pdf_engine::compress_pdf,
      pdf_engine::merge_pdf,
      pdf_engine::split_pdf,
      pdf_engine::pdf_to_image,
      pdf_engine::protect_pdf,
      pdf_engine::rotate_pdf,
      pdf_engine::unlock_pdf,
      pdf_engine::watermark_pdf,
      pdf_engine::image_to_pdf,
      pdf_engine::crop_pdf,
      pdf_engine::get_pdf_metadata,
      pdf_engine::get_pdf_info,
      pdf_engine::get_temp_dir,
      pdf_engine::save_file_to,
      pdf_engine::cleanup_temp,
      pdf_engine::delete_pages,
      pdf_engine::reorder_pages,
      pdf_engine::add_page_numbers,
      pdf_engine::pdf_to_text,
      pdf_engine::grayscale_pdf,
      pdf_engine::ocr_pdf,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
