// Transfer orchestration and coordination
use crate::config::{TransferConfig, Protocol};
use crate::core::transfer::{
    TransferProgress, TransferResult, TransferSession,
    MetricsCollector, StatePersistence
};
use crate::core::transfer::session_manager::SessionManager;
use crate::core::transfer::transfer_executor::TransferExecutor;
use crate::core::transfer::progress_tracker::ProgressTracker;
use crate::core::transfer::background_tasks::BackgroundTasks;
use crate::errors::{TransferError, RetryHandler, RetryConfiguration};
use crate::utils::events::{EventEmitter, EventBuilder};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn};

/// Transfer orchestrator coordinates all transfer operations
pub struct TransferOrchestrator {
    session_manager: Arc<SessionManager>,
    progress_tracker: ProgressTracker,
    event_emitter: Arc<dyn EventEmitter>,
    metrics_collector: Arc<MetricsCollector>,
    state_persistence: Arc<StatePersistence>,
    retry_handler: RetryHandler,
}

impl TransferOrchestrator {
    pub fn new(event_emitter: Arc<dyn EventEmitter>) -> Self {
        let retry_config = RetryConfiguration::default().with_delays(
            Duration::from_millis(500),
            Duration::from_secs(30),
        );

        Self {
            session_manager: Arc::new(SessionManager::new()),
            progress_tracker: ProgressTracker::new(),
            event_emitter,
            metrics_collector: Arc::new(MetricsCollector::new()),
            state_persistence: Arc::new(StatePersistence::new(std::env::temp_dir().join("file_transfer_sessions"))),
            retry_handler: RetryHandler::new(retry_config),
        }
    }

    /// Start the orchestrator background tasks
    pub async fn start(&self) -> Result<(), TransferError> {
        // Start progress tracking task
        self.progress_tracker.start_tracking(
            self.session_manager.get_sessions_ref(),
            Arc::clone(&self.event_emitter),
            Arc::clone(&self.metrics_collector),
        ).await.map_err(|e| TransferError::Unknown {
            message: format!("Failed to start progress tracking: {}", e),
            context: None,
        })?;

        // Start cleanup task
        BackgroundTasks::start_cleanup_task(Arc::clone(&self.session_manager));

        // Load persisted state
        self.load_persisted_state().await?;

        info!("Transfer orchestrator started");
        Ok(())
    }

    /// Create a new transfer session
    pub async fn create_session(&self, config: TransferConfig) -> Result<String, TransferError> {
        self.session_manager.create_session(config).await
    }

    /// Start a file transfer
    pub async fn start_transfer(
        &self,
        transfer_id: String,
        file_path: PathBuf,
        target_address: String,
    ) -> Result<(), TransferError> {
        // Get file size
        let metadata = tokio::fs::metadata(&file_path).await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to read file metadata: {}", e),
                file_path: Some(file_path.display().to_string()),
                recoverable: false,
            })?;

        let file_size = metadata.len();

        // Get and update session
        let (config, cancellation_flag) = self.session_manager.start_session(
            &transfer_id,
            Some(file_path.clone()),
            Some(target_address.clone()),
            file_size,
        ).await?;

        // Emit started event
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let started_event = EventBuilder::started_event(
            transfer_id.clone(),
            filename,
            file_size,
            target_address.clone(),
            config.protocol.to_string(),
            config.mode.to_string(),
        );
        self.event_emitter.emit_started(started_event);

        // Start the actual transfer in a background task
        let session_manager_clone = Arc::clone(&self.session_manager);
        let event_emitter_clone = Arc::clone(&self.event_emitter);
        let progress_sender = self.progress_tracker.get_sender();
        let metrics_collector_clone = Arc::clone(&self.metrics_collector);
        let state_persistence_clone = Arc::clone(&self.state_persistence);
        let retry_handler = self.retry_handler.clone();

        tokio::spawn(async move {
            let result = Self::execute_transfer_with_retry(
                transfer_id.clone(),
                config,
                file_path,
                target_address,
                progress_sender,
                cancellation_flag,
                retry_handler,
            ).await;

            // Handle transfer completion
            Self::handle_transfer_completion(
                transfer_id,
                result,
                session_manager_clone,
                event_emitter_clone,
                state_persistence_clone,
                metrics_collector_clone,
            ).await;
        });

        Ok(())
    }

    /// Start a file receiver
    pub async fn start_receiver(
        &self,
        transfer_id: String,
        port: u16,
        protocol: Protocol,
        output_dir: PathBuf,
    ) -> Result<(), TransferError> {
        // Get and update session
        let (config, cancellation_flag) = self.session_manager.start_session(
            &transfer_id,
            None,
            Some(format!("0.0.0.0:{}", port)),
            0,
        ).await?;

        // Emit connection event
        let connection_event = EventBuilder::connection_event(
            Some(transfer_id.clone()),
            "listening".to_string(),
            format!("0.0.0.0:{}", port),
            protocol.to_string(),
            true,
            None,
        );
        self.event_emitter.emit_connection(connection_event);

        // Start the receiver in a background task
        let session_manager_clone = Arc::clone(&self.session_manager);
        let event_emitter_clone = Arc::clone(&self.event_emitter);
        let progress_sender = self.progress_tracker.get_sender();
        let metrics_collector_clone = Arc::clone(&self.metrics_collector);
        let state_persistence_clone = Arc::clone(&self.state_persistence);
        let retry_handler = self.retry_handler.clone();

        tokio::spawn(async move {
            let bind_addr = SocketAddr::from(([0, 0, 0, 0], port));
            let result = Self::execute_receiver_with_retry(
                transfer_id.clone(),
                config,
                bind_addr,
                output_dir,
                progress_sender,
                cancellation_flag,
                retry_handler,
            ).await;

            // Handle transfer completion
            Self::handle_transfer_completion(
                transfer_id,
                result,
                session_manager_clone,
                event_emitter_clone,
                state_persistence_clone,
                metrics_collector_clone,
            ).await;
        });

        Ok(())
    }

    /// Cancel a transfer
    pub async fn cancel_transfer(&self, transfer_id: String, reason: String) -> Result<(), TransferError> {
        let bytes_transferred = self.session_manager.cancel_session(&transfer_id).await?;

        // Emit cancelled event
        let cancelled_event = EventBuilder::cancelled_event(
            transfer_id,
            reason,
            bytes_transferred,
        );
        self.event_emitter.emit_cancelled(cancelled_event);

        Ok(())
    }

    /// Get transfer progress
    pub async fn get_progress(&self, transfer_id: &str) -> Result<TransferProgress, TransferError> {
        self.session_manager.get_progress(transfer_id).await
    }

    /// Get all active transfers
    pub async fn get_active_transfers(&self) -> Vec<TransferSession> {
        self.session_manager.get_active_transfers().await
    }

    /// Get transfer history
    pub async fn get_transfer_history(&self) -> Vec<TransferSession> {
        self.session_manager.get_transfer_history().await
    }

    /// Remove completed transfers from memory
    pub async fn cleanup_completed_transfers(&self) -> usize {
        self.session_manager.cleanup_completed_transfers().await
    }

    // Private implementation methods
    async fn execute_transfer_with_retry(
        transfer_id: String,
        config: TransferConfig,
        file_path: PathBuf,
        target_address: String,
        _progress_sender: tokio::sync::mpsc::UnboundedSender<crate::core::transfer::TransferProgressUpdate>,
        cancellation_flag: Arc<std::sync::atomic::AtomicBool>,
        retry_handler: RetryHandler,
    ) -> Result<TransferResult, TransferError> {
        // Create progress tracking channel
        let (progress_tx, _progress_rx) = tokio::sync::mpsc::unbounded_channel();

        // Execute transfer with retry logic
        let progress_tx_clone = progress_tx.clone();
        let transfer_id_clone = transfer_id.clone();
        let config_clone = config.clone();
        let file_path_clone = file_path.clone();
        let target_address_clone = target_address.clone();
        let cancellation_flag_clone = Arc::clone(&cancellation_flag);
        
        let result = retry_handler.retry_with_backoff(move || {
            let progress_tx = progress_tx_clone.clone();
            let transfer_id = transfer_id_clone.clone();
            let config = config_clone.clone();
            let file_path = file_path_clone.clone();
            let target_address = target_address_clone.clone();
            let cancellation_flag = Arc::clone(&cancellation_flag_clone);
            
            async move {
                TransferExecutor::execute_transfer(
                    &config,
                    &file_path,
                    &target_address,
                    progress_tx,
                    transfer_id,
                    cancellation_flag,
                ).await
            }
        }).await;

        result
    }

    async fn execute_receiver_with_retry(
        transfer_id: String,
        config: TransferConfig,
        bind_addr: SocketAddr,
        output_dir: PathBuf,
        _progress_sender: tokio::sync::mpsc::UnboundedSender<crate::core::transfer::TransferProgressUpdate>,
        cancellation_flag: Arc<std::sync::atomic::AtomicBool>,
        retry_handler: RetryHandler,
    ) -> Result<TransferResult, TransferError> {
        // Create progress tracking channel
        let (progress_tx, _progress_rx) = tokio::sync::mpsc::unbounded_channel();

        // Execute receiver with retry logic
        let progress_tx_clone = progress_tx.clone();
        let transfer_id_clone = transfer_id.clone();
        let config_clone = config.clone();
        let output_dir_clone = output_dir.clone();
        let cancellation_flag_clone = Arc::clone(&cancellation_flag);
        
        let result = retry_handler.retry_with_backoff(move || {
            let progress_tx = progress_tx_clone.clone();
            let transfer_id = transfer_id_clone.clone();
            let config = config_clone.clone();
            let output_dir = output_dir_clone.clone();
            let cancellation_flag = Arc::clone(&cancellation_flag_clone);
            
            async move {
                TransferExecutor::execute_receiver(
                    &config,
                    bind_addr,
                    &output_dir,
                    progress_tx,
                    transfer_id,
                    cancellation_flag,
                ).await
            }
        }).await;

        result
    }



    async fn handle_transfer_completion(
        transfer_id: String,
        result: Result<TransferResult, TransferError>,
        session_manager: Arc<SessionManager>,
        event_emitter: Arc<dyn EventEmitter>,
        state_persistence: Arc<StatePersistence>,
        metrics_collector: Arc<MetricsCollector>,
    ) {
        match result {
            Ok(transfer_result) => {
                session_manager.complete_session(&transfer_id, Some(transfer_result.checksum.clone())).await;
                
                // Get session for protocol info
                if let Ok(session) = session_manager.get_session(&transfer_id).await {
                    // Record metrics
                    metrics_collector.record_transfer(
                        transfer_id.clone(),
                        session.config.protocol.clone(),
                        transfer_result.bytes_transferred,
                        transfer_result.duration,
                        true,
                    );

                    // Emit completion event
                    let completed_event = EventBuilder::completed_event(
                        transfer_id.clone(),
                        transfer_result.bytes_transferred,
                        transfer_result.duration.as_millis() as u64,
                        transfer_result.checksum,
                        session.config.protocol.to_string(),
                    );
                    event_emitter.emit_completed(completed_event);

                    // Persist session state
                    let _ = state_persistence.save_session(&session);
                }
            }
            Err(error) => {
                session_manager.fail_session(&transfer_id, error.to_string()).await;
                
                // Get session for protocol info
                if let Ok(session) = session_manager.get_session(&transfer_id).await {
                    // Record metrics
                    metrics_collector.record_transfer(
                        transfer_id.clone(),
                        session.config.protocol.clone(),
                        0,
                        Duration::from_secs(0),
                        false,
                    );

                    // Emit error event
                    let error_event = EventBuilder::error_event(transfer_id.clone(), &error);
                    event_emitter.emit_error(error_event);

                    // Persist session state
                    let _ = state_persistence.save_session(&session);
                }
            }
        }
    }



    async fn load_persisted_state(&self) -> Result<(), TransferError> {
        match self.state_persistence.load_sessions().await {
            Ok(persisted_sessions) => {
                let session_count = persisted_sessions.len();
                self.session_manager.load_sessions(persisted_sessions).await;
                info!("Loaded {} persisted transfer sessions", session_count);
                Ok(())
            }
            Err(e) => {
                warn!("Failed to load persisted state: {}", e);
                Ok(()) // Don't fail startup if we can't load state
            }
        }
    }
}