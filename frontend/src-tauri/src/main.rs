// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

use file_transfer_backend::{
    start_file_transfer, start_file_receiver, get_transfer_progress, cancel_transfer,
    TransferConfig, Protocol, TransferProgress, TransferError,
    TransferEvent, EventEmitter, initialize_orchestrator
};

// Tauri-specific event emitter that sends events to the frontend
#[derive(Clone)]
pub struct TauriEventEmitter {
    app_handle: AppHandle,
}

impl TauriEventEmitter {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

impl EventEmitter for TauriEventEmitter {
    fn emit_event(&self, event: TransferEvent) {
        let event_name = match &event {
            TransferEvent::Started(_) => "transfer-started",
            TransferEvent::Progress(_) => "transfer-progress", 
            TransferEvent::Error(_) => "transfer-error",
            TransferEvent::Completed(_) => "transfer-completed",
            TransferEvent::Cancelled(_) => "transfer-cancelled",
            TransferEvent::Connection(_) => "transfer-connection",
        };
        
        if let Err(e) = self.app_handle.emit(event_name, &event) {
            eprintln!("Failed to emit event {}: {}", event_name, e);
        }
    }
}

// Global state to store the event emitter
type EventEmitterState = Arc<Mutex<Option<TauriEventEmitter>>>;

// Serializable error type for Tauri commands
#[derive(Debug, Serialize, Deserialize)]
pub struct TauriError {
    pub message: String,
    pub code: String,
}

impl From<TransferError> for TauriError {
    fn from(error: TransferError) -> Self {
        TauriError {
            message: error.to_string(),
            code: format!("{:?}", error).split('(').next().unwrap_or("Unknown").to_string(),
        }
    }
}

// Tauri command to initialize the backend
#[tauri::command]
async fn initialize_backend(
    app_handle: AppHandle,
    event_emitter_state: tauri::State<'_, EventEmitterState>,
) -> Result<(), TauriError> {
    // Initialize the orchestrator
    initialize_orchestrator().await.map_err(TauriError::from)?;
    
    // Create and store the event emitter
    let emitter = TauriEventEmitter::new(app_handle);
    let mut state = event_emitter_state.lock().unwrap();
    *state = Some(emitter);
    
    Ok(())
}

// Tauri command to start file transfer
#[tauri::command]
async fn transfer_file(
    config: TransferConfig,
    file_path: String,
    target: String,
) -> Result<String, TauriError> {
    start_file_transfer(config, file_path, target)
        .await
        .map_err(TauriError::from)
}

// Tauri command to start file receiver
#[tauri::command]
async fn receive_file(
    port: u16,
    protocol: String,
    output_dir: String,
) -> Result<String, TauriError> {
    let protocol = match protocol.as_str() {
        "Tcp" | "tcp" => Protocol::Tcp,
        "Udp" | "udp" => Protocol::Udp,
        _ => return Err(TauriError {
            message: "Invalid protocol. Must be 'Tcp' or 'Udp'".to_string(),
            code: "InvalidProtocol".to_string(),
        }),
    };
    
    start_file_receiver(port, protocol, output_dir)
        .await
        .map_err(TauriError::from)
}

// Tauri command to get transfer progress
#[tauri::command]
async fn get_progress(transfer_id: String) -> Result<TransferProgress, TauriError> {
    get_transfer_progress(transfer_id)
        .await
        .map_err(TauriError::from)
}

// Tauri command to cancel transfer
#[tauri::command]
async fn cancel_transfer_cmd(transfer_id: String) -> Result<(), TauriError> {
    cancel_transfer(transfer_id)
        .await
        .map_err(TauriError::from)
}

// Tauri command to validate configuration
#[tauri::command]
async fn validate_config(config: TransferConfig) -> Result<bool, TauriError> {
    use file_transfer_backend::validate_communication_config;
    
    validate_communication_config(&config)
        .map(|_| true)
        .map_err(TauriError::from)
}

// Tauri command to check receiver availability
#[tauri::command]
async fn check_receiver_availability(
    protocol: String,
    target_ip: String,
    port: u16,
    timeout_seconds: u64,
) -> Result<bool, TauriError> {
    use file_transfer_backend::check_receiver_availability;
    use std::net::SocketAddr;
    use std::time::Duration;
    
    let protocol = match protocol.as_str() {
        "Tcp" | "tcp" => Protocol::Tcp,
        "Udp" | "udp" => Protocol::Udp,
        _ => return Err(TauriError {
            message: "Invalid protocol. Must be 'Tcp' or 'Udp'".to_string(),
            code: "InvalidProtocol".to_string(),
        }),
    };
    
    let addr: SocketAddr = format!("{}:{}", target_ip, port)
        .parse()
        .map_err(|_| TauriError {
            message: "Invalid IP address or port".to_string(),
            code: "InvalidAddress".to_string(),
        })?;
    
    let timeout = Duration::from_secs(timeout_seconds);
    let available = check_receiver_availability(protocol, addr, timeout).await;
    
    Ok(available)
}

fn main() {
    let event_emitter_state: EventEmitterState = Arc::new(Mutex::new(None));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(event_emitter_state)
        .invoke_handler(tauri::generate_handler![
            initialize_backend,
            transfer_file,
            receive_file,
            get_progress,
            cancel_transfer_cmd,
            validate_config,
            check_receiver_availability
        ])
        .setup(|_app| {
            // Backend will be initialized when first command is called
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}