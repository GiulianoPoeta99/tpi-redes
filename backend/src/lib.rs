// Library exports for Tauri integration
pub mod config;
pub mod sockets;
pub mod transfer;
pub mod crypto;
pub mod utils;

#[cfg(test)]
mod tests;

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::OnceCell;

// Re-export main types for external use
pub use config::{TransferConfig, Protocol, TransferMode};
pub use transfer::{TransferProgress, TransferResult, TransferStatus, TransferOrchestrator, TransferSession};
pub use utils::errors::TransferError;
pub use utils::events::{BroadcastEventEmitter, EventEmitter, TransferEvent};

// Global orchestrator instance
static ORCHESTRATOR: OnceCell<Arc<TransferOrchestrator>> = OnceCell::const_new();

/// Initialize the transfer orchestrator
pub async fn initialize_orchestrator() -> Result<Arc<TransferOrchestrator>, TransferError> {
    ORCHESTRATOR.get_or_try_init(|| async {
        let (event_emitter, _receiver) = BroadcastEventEmitter::new(1000);
        let orchestrator = Arc::new(TransferOrchestrator::new(Arc::new(event_emitter)));
        orchestrator.start().await?;
        Ok(orchestrator)
    }).await.map(|o| Arc::clone(o))
}

/// Get the global orchestrator instance
pub async fn get_orchestrator() -> Result<Arc<TransferOrchestrator>, TransferError> {
    if let Some(orchestrator) = ORCHESTRATOR.get() {
        Ok(Arc::clone(orchestrator))
    } else {
        initialize_orchestrator().await
    }
}

// Main library functions for Tauri commands
pub async fn start_file_transfer(
    config: TransferConfig,
    file_path: String,
    target: String,
) -> Result<String, TransferError> {
    let orchestrator = get_orchestrator().await?;
    
    // Create transfer session
    let transfer_id = orchestrator.create_session(config).await?;
    
    // Start the transfer
    orchestrator.start_transfer(
        transfer_id.clone(),
        PathBuf::from(file_path),
        target,
    ).await?;
    
    Ok(transfer_id)
}

pub async fn start_file_receiver(
    port: u16,
    protocol: Protocol,
    output_dir: String,
) -> Result<String, TransferError> {
    let orchestrator = get_orchestrator().await?;
    
    // Create receiver config
    let config = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: protocol.clone(),
        target_ip: None,
        port,
        filename: None,
        chunk_size: 8192,
        timeout: std::time::Duration::from_secs(30),
    };
    
    // Create transfer session
    let transfer_id = orchestrator.create_session(config).await?;
    
    // Start the receiver
    orchestrator.start_receiver(
        transfer_id.clone(),
        port,
        protocol,
        PathBuf::from(output_dir),
    ).await?;
    
    Ok(transfer_id)
}

pub async fn get_transfer_progress(transfer_id: String) -> Result<TransferProgress, TransferError> {
    let orchestrator = get_orchestrator().await?;
    orchestrator.get_progress(&transfer_id).await
}

pub async fn cancel_transfer(transfer_id: String) -> Result<(), TransferError> {
    let orchestrator = get_orchestrator().await?;
    orchestrator.cancel_transfer(transfer_id, "User requested cancellation".to_string()).await
}

pub async fn get_active_transfers() -> Result<Vec<TransferSession>, TransferError> {
    let orchestrator = get_orchestrator().await?;
    Ok(orchestrator.get_active_transfers().await)
}

pub async fn get_transfer_history() -> Result<Vec<TransferSession>, TransferError> {
    let orchestrator = get_orchestrator().await?;
    Ok(orchestrator.get_transfer_history().await)
}

pub async fn cleanup_completed_transfers() -> Result<usize, TransferError> {
    let orchestrator = get_orchestrator().await?;
    Ok(orchestrator.cleanup_completed_transfers().await)
}