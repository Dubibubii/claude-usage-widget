// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // statusline helper mode: `<binary> --statusline` (no GUI) — what Claude
    // Code invokes; the widget app itself runs without args
    if std::env::args().any(|a| a == "--statusline") {
        claude_usage_widget_lib::run_statusline();
        return;
    }
    claude_usage_widget_lib::run()
}
