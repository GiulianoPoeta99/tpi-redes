// Progress tracking for transfer orchestrator
use crate::core::transfer::{TransferProgressUpdate, MetricsCollector};
use crate::utils::events::{EventEmitter, EventBuilder};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use crate::core::transfer::TransferSession;

/// Handles progress tracking and event emission for transfers
pub struct ProgressTracker {
    progress_sender: mpsc::UnboundedSender<TransferProgressUpdate>,
    progress_receiver: Arc<tokio::sync::Mutex<Option<mpsc::UnboundedReceiver<TransferProgressUpdate>>>>,
}

impl ProgressTracker {
    pub fn new() -> Self {
        let (progress_sender, progress_receiver) = mpsc::unbounded_channel();
        
        Self {
            progress_sender,
            progress_receiver: Arc::new(tokio::sync::Mutex::new(Some(progress_receiver))),
        }
    }

    /// Get a sender for progress updates
    pub fn get_sender(&self) -> mpsc::UnboundedSender<TransferProgressUpdate> {
        self.progress_sender.clone()
    }

    /// Start the progress tracking task
    pub async fn start_tracking(
        &self,
        sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
        event_emitter: Arc<dyn EventEmitter>,
        metrics_collector: Arc<MetricsCollector>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let progress_receiver = self.progress_receiver.lock().await.take()
            .ok_or("Progress receiver already taken")?;

        tokio::spawn(async move {
            Self::progress_tracking_task(
                progress_receiver,
                sessions,
                event_emitter,
                metrics_collector,
            ).await;
        });

        Ok(())
    }

    /// Create a progress monitoring task for a specific transfer
    pub fn create_progress_monitor(
        &self,
        transfer_id: String,
        sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
        mut progress_rx: mpsc::UnboundedReceiver<TransferProgressUpdate>,
    ) -> tokio::task::JoinHandle<()> {
        let progress_sender = self.progress_sender.clone();
        
        tokio::spawn(async move {
            while let Some(update) = progress_rx.recv().await {
                // Update session
                {
                    let mut sessions = sessions.write().await;
                    if let Some(session) = sessions.get_mut(&transfer_id) {
                        session.update_progress(update.bytes_transferred, update.speed, update.eta);
                    }
                }

                // Forward to orchestrator
                let _ = progress_sender.send(TransferProgressUpdate {
                    transfer_id: transfer_id.clone(),
                    bytes_transferred: update.bytes_transferred,
                    total_bytes: update.total_bytes,
                    speed: update.speed,
                    eta: update.eta,
                });
            }
        })
    }

    async fn progress_tracking_task(
        mut progress_receiver: mpsc::UnboundedReceiver<TransferProgressUpdate>,
        sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
        event_emitter: Arc<dyn EventEmitter>,
        metrics_collector: Arc<MetricsCollector>,
    ) {
        while let Some(update) = progress_receiver.recv().await {
            // Update session
            {
                let mut sessions = sessions.write().await;
                if let Some(session) = sessions.get_mut(&update.transfer_id) {
                    session.update_progress(update.bytes_transferred, update.speed, update.eta);
                }
            }

            // Emit progress event
            let progress_event = EventBuilder::progress_event(
                update.transfer_id.clone(),
                if update.total_bytes > 0 { 
                    update.bytes_transferred as f64 / update.total_bytes as f64 
                } else { 
                    0.0 
                },
                update.speed,
                update.eta,
                update.bytes_transferred,
                update.total_bytes,
            );
            event_emitter.emit_progress(progress_event);

            // Update metrics
            metrics_collector.update_transfer_progress(
                &update.transfer_id,
                update.bytes_transferred,
                update.speed,
            );
        }
    }
}