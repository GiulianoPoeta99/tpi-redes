// Library exports for Tauri integration
pub mod config;
pub mod sockets;
pub mod transfer;
pub mod crypto;
pub mod utils;

#[cfg(test)]
mod tests;

// Re-export main types for external use
pub use config::{TransferConfig, Protocol, TransferMode};
pub use transfer::{TransferProgress, TransferResult, TransferStatus};
pub use utils::errors::TransferError;

// Main library functions for Tauri commands
pub async fn start_file_transfer(
    _config: TransferConfig,
    _file_path: String,
    _target: String,
) -> Result<String, TransferError> {
    // Implementation will be added in later tasks
    todo!("Implementation in task 7")
}

pub async fn start_file_receiver(
    port: u16,
    protocol: Protocol,
    output_dir: String,
) -> Result<String, TransferError> {
    // Implementation will be added in later tasks
    todo!("Implementation in task 7")
}

pub async fn get_transfer_progress(transfer_id: String) -> Result<TransferProgress, TransferError> {
    // Implementation will be added in later tasks
    todo!("Implementation in task 7")
}

pub async fn cancel_transfer(transfer_id: String) -> Result<(), TransferError> {
    // Implementation will be added in later tasks
    todo!("Implementation in task 7")
}