// Legacy transfer operations - delegates to core
use crate::config::{TransferConfig, Protocol};
use crate::errors::TransferError;
use crate::core::TransferManager;
use crate::core::transfer::{TransferProgress, TransferSession};

// Main library functions for Tauri commands
pub async fn start_file_transfer(
    config: TransferConfig,
    file_path: String,
    target: String,
) -> Result<String, TransferError> {
    TransferManager::start_file_transfer(config, file_path, target).await
}

pub async fn start_file_receiver(
    port: u16,
    protocol: Protocol,
    output_dir: String,
) -> Result<String, TransferError> {
    TransferManager::start_file_receiver(port, protocol, output_dir).await
}

pub async fn get_transfer_progress(transfer_id: String) -> Result<TransferProgress, TransferError> {
    TransferManager::get_transfer_progress(transfer_id).await
}

pub async fn cancel_transfer(transfer_id: String) -> Result<(), TransferError> {
    TransferManager::cancel_transfer(transfer_id).await
}

pub async fn get_active_transfers() -> Result<Vec<TransferSession>, TransferError> {
    TransferManager::get_active_transfers().await
}

pub async fn get_transfer_history() -> Result<Vec<TransferSession>, TransferError> {
    TransferManager::get_transfer_history().await
}

pub async fn cleanup_completed_transfers() -> Result<usize, TransferError> {
    TransferManager::cleanup_completed_transfers().await
}