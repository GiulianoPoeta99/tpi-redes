// Orchestrator management for core library
use crate::errors::TransferError;
use crate::core::transfer::TransferOrchestrator;
use crate::utils::events::BroadcastEventEmitter;
use std::sync::Arc;
use tokio::sync::OnceCell;

// Global orchestrator instance
static ORCHESTRATOR: OnceCell<Arc<TransferOrchestrator>> = OnceCell::const_new();

pub struct OrchestratorManager;

impl OrchestratorManager {
    /// Initialize the transfer orchestrator
    pub async fn initialize() -> Result<Arc<TransferOrchestrator>, TransferError> {
        ORCHESTRATOR.get_or_try_init(|| async {
            let (event_emitter, receiver) = BroadcastEventEmitter::new(1000);
            let orchestrator = Arc::new(TransferOrchestrator::new(Arc::new(event_emitter)));
            
            // Keep a receiver alive to prevent channel from closing
            tokio::spawn(async move {
                let mut receiver = receiver;
                while let Ok(_event) = receiver.recv().await {
                    // Just consume events to keep channel alive
                    // In a real application, you might log these or handle them
                }
            });
            
            orchestrator.start().await?;
            Ok(orchestrator)
        }).await.map(|o| Arc::clone(o))
    }

    /// Get the global orchestrator instance
    pub async fn get_instance() -> Result<Arc<TransferOrchestrator>, TransferError> {
        if let Some(orchestrator) = ORCHESTRATOR.get() {
            Ok(Arc::clone(orchestrator))
        } else {
            Self::initialize().await
        }
    }
}