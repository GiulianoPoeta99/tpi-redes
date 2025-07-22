// Receive command handler
use crate::cli::CliError;
use crate::config::Protocol;
use crate::core::api::start_file_receiver;
use std::path::PathBuf;
use tracing::info;

pub async fn handle_receive_command(
    port: u16,
    protocol: String,
    output: PathBuf,
    timeout: u64,
) -> Result<i32, CliError> {
    // Validate output directory
    if !output.exists() {
        if let Err(e) = tokio::fs::create_dir_all(&output).await {
            return Err(CliError::file_system(
                format!("Failed to create output directory: {}", e),
                Some(output.display().to_string()),
            ));
        }
    }
    
    if !output.is_dir() {
        return Err(CliError::file_system(
            format!("Output path is not a directory: {}", output.display()),
            Some(output.display().to_string()),
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
    
    println!("Starting file receiver...");
    println!("  Port: {}", port);
    println!("  Protocol: {:?}", protocol);
    println!("  Output directory: {}", output.display());
    println!("  Timeout: {}s", timeout);
    println!();
    println!("Waiting for incoming connections...");
    
    // Start the receiver
    let transfer_id = match start_file_receiver(port, protocol, output.display().to_string()).await {
        Ok(id) => {
            info!("Receiver started with ID: {}", id);
            id
        }
        Err(e) => {
            return Err(CliError::Transfer(e));
        }
    };
    
    // Monitor progress
    crate::cli::progress_monitor::monitor_transfer_progress(&transfer_id).await
}