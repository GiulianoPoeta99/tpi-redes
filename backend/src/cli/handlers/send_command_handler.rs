// Send command handler
use crate::cli::CliError;
use crate::config::{TransferConfig, Protocol, TransferMode};
use crate::core::api::start_file_transfer;
use std::path::PathBuf;
use std::time::Duration;
use tracing::info;

pub async fn handle_send_command(
    target: String,
    port: u16,
    protocol: String,
    file: PathBuf,
    chunk_size: usize,
    timeout: u64,
) -> Result<i32, CliError> {
    // Validate file exists and is readable
    if !file.exists() {
        return Err(CliError::file_system(
            format!("File does not exist: {}", file.display()),
            Some(file.display().to_string()),
        ));
    }
    
    if !file.is_file() {
        return Err(CliError::file_system(
            format!("Path is not a file: {}", file.display()),
            Some(file.display().to_string()),
        ));
    }
    
    // Parse protocol
    let protocol = match protocol.as_str() {
        "tcp" => Protocol::Tcp,
        "udp" => Protocol::Udp,
        _ => {
            return Err(CliError::invalid_argument(
                "protocol",
                format!("Invalid protocol '{}'. Use 'tcp' or 'udp'", protocol),
            ));
        }
    };
    
    // Create configuration
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: protocol.clone(),
        target_ip: Some(target.clone()),
        port,
        filename: file.file_name().and_then(|n| n.to_str()).map(String::from),
        chunk_size,
        timeout: Duration::from_secs(timeout),
        ..Default::default()
    };
    
    // Validate configuration
    if let Err(e) = config.validate() {
        return Err(CliError::configuration(format!("Configuration validation failed: {}", e)));
    }
    
    // Get file metadata for display
    let metadata = tokio::fs::metadata(&file).await?;
    let file_size = metadata.len();
    let filename = file.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    
    println!("Starting file transfer...");
    println!("  File: {} ({} bytes)", filename, file_size);
    println!("  Target: {}:{}", target, port);
    println!("  Protocol: {:?}", protocol);
    println!("  Chunk size: {} bytes", chunk_size);
    println!("  Timeout: {}s", timeout);
    println!();
    
    // Start the transfer
    let target_address = format!("{}:{}", target, port);
    let transfer_id = match start_file_transfer(config, file.display().to_string(), target_address).await {
        Ok(id) => {
            info!("Transfer started with ID: {}", id);
            id
        }
        Err(e) => {
            return Err(CliError::Transfer(e));
        }
    };
    
    // Monitor progress
    crate::cli::progress_monitor::monitor_transfer_progress(&transfer_id).await
}