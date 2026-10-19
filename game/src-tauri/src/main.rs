// MRAK :: Тёмный код мести — нативная обёртка Tauri v2 (офлайн).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("ошибка запуска MRAK");
}
