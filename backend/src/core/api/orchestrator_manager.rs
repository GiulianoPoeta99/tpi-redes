// Legacy orchestrator management - delegates to core
use crate::errors::TransferError;
use crate::core::transfer::TransferOrchestrator;
use crate::core::OrchestratorManager;
use std::sync::Arc;

/// Initialize the transfer orchestrator
pub async fn initialize_orchestrator() -> Result<Arc<TransferOrchestrator>, TransferError> {
    OrchestratorManager::initialize().await
}

/// Get the global orchestrator instance
pub async fn get_orchestrator() -> Result<Arc<TransferOrchestrator>, TransferError> {
    OrchestratorManager::get_instance().await
}