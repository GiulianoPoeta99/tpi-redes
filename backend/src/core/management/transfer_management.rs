// Transfer management for core library
use crate::config::{TransferConfig, Protocol, TransferMode};
use crate::errors::TransferError;
use crate::core::orchestrator_management::OrchestratorManager;
use crate::core::transfer::{TransferProgress, TransferSession};
use std::path::PathBuf;

pub struct TransferManager;

impl TransferManager {
    pub async fn start_file_transfer(
        config: TransferConfig,
        file_path: String,
        target: String,
    ) -> Result<String, TransferError> {
        let orchestrator = OrchestratorManager::get_instance().await?;
        
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
        let orchestrator = OrchestratorManager::get_instance().await?;
        
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
        let orchestrator = OrchestratorManager::get_instance().await?;
        orchestrator.get_progress(&transfer_id).await
    }

    pub async fn cancel_transfer(transfer_id: String) -> Result<(), TransferError> {
        let orchestrator = OrchestratorManager::get_instance().await?;
        orchestrator.cancel_transfer(transfer_id, "User requested cancellation".to_string()).await
    }

    pub async fn get_active_transfers() -> Result<Vec<TransferSession>, TransferError> {
        let orchestrator = OrchestratorManager::get_instance().await?;
        Ok(orchestrator.get_active_transfers().await)
    }

    pub async fn get_transfer_history() -> Result<Vec<TransferSession>, TransferError> {
        let orchestrator = OrchestratorManager::get_instance().await?;
        Ok(orchestrator.get_transfer_history().await)
    }

    pub async fn cleanup_completed_transfers() -> Result<usize, TransferError> {
        let orchestrator = OrchestratorManager::get_instance().await?;
        Ok(orchestrator.cleanup_completed_transfers().await)
    }
}