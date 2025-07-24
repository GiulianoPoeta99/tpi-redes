// Public API exports for external use

// Main configuration types
pub use crate::config::{TransferConfig, Protocol, TransferMode};

// Transfer types
pub use crate::core::transfer::{TransferProgress, TransferResult, TransferStatus, TransferOrchestrator, TransferSession};

// Error types
pub use crate::errors::TransferError;

// Event types
pub use crate::utils::events::{BroadcastEventEmitter, EventEmitter, TransferEvent};

// Core interface
pub use crate::core::api::library_interface::LibraryInterface;

// Legacy compatibility functions
pub async fn initialize_orchestrator() -> Result<(), TransferError> {
    LibraryInterface::initialize_orchestrator().await
}

pub async fn start_file_transfer(
    config: TransferConfig,
    file_path: String,
    target: String,
) -> Result<String, TransferError> {
    LibraryInterface::start_file_transfer(config, file_path, target).await
}

pub async fn start_file_receiver(
    port: u16,
    protocol: Protocol,
    output_dir: String,
) -> Result<String, TransferError> {
    LibraryInterface::start_file_receiver(port, protocol, output_dir).await
}

pub async fn get_transfer_progress(transfer_id: String) -> Result<TransferProgress, TransferError> {
    LibraryInterface::get_transfer_progress(transfer_id).await
}

pub async fn cancel_transfer(transfer_id: String) -> Result<(), TransferError> {
    LibraryInterface::cancel_transfer(transfer_id).await
}

pub async fn get_active_transfers() -> Result<Vec<TransferSession>, TransferError> {
    LibraryInterface::get_active_transfers().await
}

pub async fn get_transfer_history() -> Result<Vec<TransferSession>, TransferError> {
    LibraryInterface::get_transfer_history().await
}

pub async fn cleanup_completed_transfers() -> Result<usize, TransferError> {
    LibraryInterface::cleanup_completed_transfers().await
}