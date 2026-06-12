// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  let args: Vec<String> = std::env::args().collect();
  if args.len() > 1 {
    match args[1].as_str() {
      "--version" | "-v" => {
        println!("pdflinux {}", env!("CARGO_PKG_VERSION"));
        return;
      }
      "--help" | "-h" => {
        println!("pdflinux {} — Privacy-first PDF tools for Linux", env!("CARGO_PKG_VERSION"));
        println!();
        println!("Usage:");
        println!("  pdflinux           Launch the application");
        println!("  pdflinux --version Print version");
        println!("  pdflinux --help    Show this help");
        return;
      }
      _ => {}
    }
  }
  pdflinux_lib::run();
}
