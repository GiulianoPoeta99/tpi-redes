// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use file_transfer_backend::{
    start_file_transfer, start_file_receiver, get_transfer_progress, cancel_transfer,
    TransferConfig, Protocol, TransferMode, TransferProgress, TransferError
};

// Tauri command to start file transfer
#[tauri::command]
async fn transfer_file(
    config: TransferConfig,
    file_path: String,
    target: String,
) -> Result<String, String> {
    start_file_transfer(config, file_path, target)
        .await
        .map_err(|e| e.to_string())
}

// Tauri command to start file receiver
#[tauri::command]
async fn receive_file(
    port: u16,
    protocol: String,
    output_dir: String,
) -> Result<String, String> {
    let protocol = match protocol.as_str() {
        "tcp" => Protocol::Tcp,
        "udp" => Protocol::Udp,
        _ => return Err("Invalid protocol".to_string()),
    };
    
    start_file_receiver(port, protocol, output_dir)
        .await
        .map_err(|e| e.to_string())
}

// Tauri command to get transfer progress
#[tauri::command]
async fn get_progress(transfer_id: String) -> Result<TransferProgress, String> {
    get_transfer_progress(transfer_id)
        .await
        .map_err(|e| e.to_string())
}

// Tauri command to cancel transfer
#[tauri::command]
async fn cancel_transfer_cmd(transfer_id: String) -> Result<(), String> {
    cancel_transfer(transfer_id)
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            transfer_file,
            receive_file,
            get_progress,
            cancel_transfer_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}