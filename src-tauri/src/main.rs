// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  let args: Vec<String> = std::env::args().collect();
  if args.len() > 1 {
    match args[1].as_str() {
      "--version" | "-v" => {
        println!("pdf-chips {}", env!("CARGO_PKG_VERSION"));
        return;
      }
      "--help" | "-h" => {
        println!("PDF & Chips {} — Privacy-first PDF tools", env!("CARGO_PKG_VERSION"));
        println!();
        println!("Usage:");
        println!("  pdf-chips           Launch the application");
        println!("  pdf-chips --version Print version");
        println!("  pdf-chips --help    Show this help");
        return;
      }
      _ => {}
    }
  }
  pdf_chips_lib::run();
}
