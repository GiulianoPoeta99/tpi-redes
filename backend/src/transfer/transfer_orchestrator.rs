// Transfer orchestration and session management
use crate::config::{TransferConfig, Protocol, TransferMode};
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::sockets::{TcpTransfer, UdpTransfer};
use crate::transfer::{TransferProgress, TransferResult, TransferStatus};
use crate::utils::errors::{TransferError, RetryHandler, RetryConfig};
use crate::utils::events::{
    EventEmitter, EventBuilder, TransferEvent, BroadcastEventEmitter,
    TransferProgressEvent, TransferStartedEvent, TransferCompletedEvent,
    TransferCancelledEvent, ConnectionEvent,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::{Duration, Instant};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use tokio::time::interval;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// Transfer session information
#[derive(Debug, Clone)]
pub struct TransferSession {
    pub id: String,
    pub config: TransferConfig,
    pub file_path: Option<PathBuf>,
    pub target_address: Option<String>,
    pub status: TransferStatus,
    pub progress: TransferProgress,
    pub start_time: Option<Instant>,
    pub end_time: Option<Instant>,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub error: Option<String>,
    pub checksum: Option<String>,
    #[allow(dead_code)]
    pub cancellation_flag: Arc<AtomicBool>,
}

impl TransferSession {
    pub fn new(id: String, config: TransferConfig) -> Self {
        let progress = TransferProgress::new(id.clone());
        Self {
            id: id.clone(),
            config,
            file_path: None,
            target_address: None,
            status: TransferStatus::Idle,
            progress,
            start_time: None,
            end_time: None,
            bytes_transferred: 0,
            total_bytes: 0,
            error: None,
            checksum: None,
            cancellation_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&mut self, file_path: Option<PathBuf>, target_address: Option<String>, total_bytes: u64) {
        self.file_path = file_path;
        self.target_address = target_address;
        self.total_bytes = total_bytes;
        self.start_time = Some(Instant::now());
        self.status = TransferStatus::Connecting;
        self.progress.status = TransferStatus::Connecting;
    }

    pub fn update_progress(&mut self, bytes_transferred: u64, speed: f64, eta: u64) {
        self.bytes_transferred = bytes_transferred;
        self.progress.update(
            if self.total_bytes > 0 { bytes_transferred as f64 / self.total_bytes as f64 } else { 0.0 },
            speed,
            eta,
        );
        if self.progress.status != TransferStatus::Error {
            self.progress.status = TransferStatus::Transferring;
            self.status = TransferStatus::Transferring;
        }
    }

    pub fn complete(&mut self, checksum: String) {
        self.end_time = Some(Instant::now());
        self.status = TransferStatus::Completed;
        self.progress.status = TransferStatus::Completed;
        self.progress.progress = 1.0;
        self.checksum = Some(checksum);
    }

    pub fn fail(&mut self, error: String) {
        self.end_time = Some(Instant::now());
        self.status = TransferStatus::Error;
        self.progress.set_error(error.clone());
        self.error = Some(error);
    }

    pub fn cancel(&mut self, reason: String) {
        self.end_time = Some(Instant::now());
        self.status = TransferStatus::Error;
        self.error = Some(format!("Cancelled: {}", reason));
        self.cancellation_flag.store(true, Ordering::SeqCst);
    }

    pub fn duration(&self) -> Option<Duration> {
        if let (Some(start), Some(end)) = (self.start_time, self.end_time) {
            Some(end.duration_since(start))
        } else if let Some(start) = self.start_time {
            Some(start.elapsed())
        } else {
            None
        }
    }

    pub fn is_terminal(&self) -> bool {
        self.status.is_terminal()
    }

    pub fn is_active(&self) -> bool {
        self.status.is_active()
    }
}

/// Transfer orchestrator manages all active transfers
pub struct TransferOrchestrator {
    sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
    event_emitter: Arc<dyn EventEmitter>,
    progress_sender: mpsc::UnboundedSender<TransferProgressUpdate>,
    progress_receiver: Arc<Mutex<Option<mpsc::UnboundedReceiver<TransferProgressUpdate>>>>,
    metrics_collector: Arc<MetricsCollector>,
    state_persistence: Arc<StatePersistence>,
    retry_handler: RetryHandler,
}

#[derive(Debug, Clone)]
struct TransferProgressUpdate {
    transfer_id: String,
    bytes_transferred: u64,
    total_bytes: u64,
    speed: f64,
    eta: u64,
}

impl TransferOrchestrator {
    pub fn new(event_emitter: Arc<dyn EventEmitter>) -> Self {
        let (progress_sender, progress_receiver) = mpsc::unbounded_channel();
        let retry_config = RetryConfig::default().with_delays(
            Duration::from_millis(500),
            Duration::from_secs(30),
        );

        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            event_emitter,
            progress_sender,
            progress_receiver: Arc::new(Mutex::new(Some(progress_receiver))),
            metrics_collector: Arc::new(MetricsCollector::new()),
            state_persistence: Arc::new(StatePersistence::new()),
            retry_handler: RetryHandler::new(retry_config),
        }
    }

    /// Start the orchestrator background tasks
    pub async fn start(&self) -> Result<(), TransferError> {
        // Start progress tracking task
        let progress_receiver = self.progress_receiver.lock().await.take()
            .ok_or_else(|| TransferError::Unknown {
                message: "Progress receiver already taken".to_string(),
                context: None,
            })?;

        let sessions_clone = Arc::clone(&self.sessions);
        let event_emitter_clone = Arc::clone(&self.event_emitter);
        let metrics_collector_clone = Arc::clone(&self.metrics_collector);

        tokio::spawn(async move {
            Self::progress_tracking_task(
                progress_receiver,
                sessions_clone,
                event_emitter_clone,
                metrics_collector_clone,
            ).await;
        });

        // Start cleanup task
        let sessions_cleanup = Arc::clone(&self.sessions);
        tokio::spawn(async move {
            Self::cleanup_task(sessions_cleanup).await;
        });

        // Load persisted state
        self.load_persisted_state().await?;

        info!("Transfer orchestrator started");
        Ok(())
    }

    /// Create a new transfer session
    pub async fn create_session(&self, config: TransferConfig) -> Result<String, TransferError> {
        let transfer_id = Uuid::new_v4().to_string();
        let session = TransferSession::new(transfer_id.clone(), config);

        let mut sessions = self.sessions.write().await;
        sessions.insert(transfer_id.clone(), session);

        debug!("Created transfer session: {}", transfer_id);
        Ok(transfer_id)
    }

    /// Start a file transfer
    pub async fn start_transfer(
        &self,
        transfer_id: String,
        file_path: PathBuf,
        target_address: String,
    ) -> Result<(), TransferError> {
        // Get and update session
        let (config, cancellation_flag) = {
            let mut sessions = self.sessions.write().await;
            let session = sessions.get_mut(&transfer_id)
                .ok_or_else(|| TransferError::Unknown {
                    message: format!("Transfer session not found: {}", transfer_id),
                    context: Some(transfer_id.clone()),
                })?;

            if session.is_active() {
                return Err(TransferError::Unknown {
                    message: "Transfer already active".to_string(),
                    context: Some(transfer_id),
                });
            }

            // Get file size
            let metadata = tokio::fs::metadata(&file_path).await
                .map_err(|e| TransferError::FileError {
                    message: format!("Failed to read file metadata: {}", e),
                    file_path: Some(file_path.display().to_string()),
                    recoverable: false,
                })?;

            let file_size = metadata.len();
            session.start(Some(file_path.clone()), Some(target_address.clone()), file_size);

            (session.config.clone(), Arc::clone(&session.cancellation_flag))
        };

        // Emit started event
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let started_event = EventBuilder::started_event(
            transfer_id.clone(),
            filename,
            {
                let sessions = self.sessions.read().await;
                sessions.get(&transfer_id).map(|s| s.total_bytes).unwrap_or(0)
            },
            target_address.clone(),
            config.protocol.to_string(),
            config.mode.to_string(),
        );
        self.event_emitter.emit_started(started_event);

        // Start the actual transfer in a background task
        let sessions_clone = Arc::clone(&self.sessions);
        let event_emitter_clone = Arc::clone(&self.event_emitter);
        let progress_sender_clone = self.progress_sender.clone();
        let metrics_collector_clone = Arc::clone(&self.metrics_collector);
        let state_persistence_clone = Arc::clone(&self.state_persistence);
        let retry_handler = self.retry_handler.clone();

        tokio::spawn(async move {
            let result = Self::execute_transfer(
                transfer_id.clone(),
                config,
                file_path,
                target_address,
                Arc::clone(&sessions_clone),
                Arc::clone(&event_emitter_clone),
                progress_sender_clone,
                metrics_collector_clone,
                cancellation_flag,
                retry_handler,
            ).await;

            // Handle transfer completion
            Self::handle_transfer_completion(
                transfer_id,
                result,
                sessions_clone,
                event_emitter_clone,
                state_persistence_clone,
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
        let (config, cancellation_flag) = {
            let mut sessions = self.sessions.write().await;
            let session = sessions.get_mut(&transfer_id)
                .ok_or_else(|| TransferError::Unknown {
                    message: format!("Transfer session not found: {}", transfer_id),
                    context: Some(transfer_id.clone()),
                })?;

            if session.is_active() {
                return Err(TransferError::Unknown {
                    message: "Transfer already active".to_string(),
                    context: Some(transfer_id),
                });
            }

            session.start(None, Some(format!("0.0.0.0:{}", port)), 0);
            (session.config.clone(), Arc::clone(&session.cancellation_flag))
        };

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
        let sessions_clone = Arc::clone(&self.sessions);
        let event_emitter_clone = Arc::clone(&self.event_emitter);
        let progress_sender_clone = self.progress_sender.clone();
        let metrics_collector_clone = Arc::clone(&self.metrics_collector);
        let state_persistence_clone = Arc::clone(&self.state_persistence);
        let retry_handler = self.retry_handler.clone();

        tokio::spawn(async move {
            let result = Self::execute_receiver(
                transfer_id.clone(),
                config,
                port,
                output_dir,
                Arc::clone(&sessions_clone),
                Arc::clone(&event_emitter_clone),
                progress_sender_clone,
                metrics_collector_clone,
                cancellation_flag,
                retry_handler,
            ).await;

            // Handle transfer completion
            Self::handle_transfer_completion(
                transfer_id,
                result,
                sessions_clone,
                event_emitter_clone,
                state_persistence_clone,
            ).await;
        });

        Ok(())
    }

    /// Cancel a transfer
    pub async fn cancel_transfer(&self, transfer_id: String, reason: String) -> Result<(), TransferError> {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(&transfer_id)
            .ok_or_else(|| TransferError::Unknown {
                message: format!("Transfer session not found: {}", transfer_id),
                context: Some(transfer_id.clone()),
            })?;

        if !session.is_active() {
            return Err(TransferError::Unknown {
                message: "Transfer not active".to_string(),
                context: Some(transfer_id),
            });
        }

        let bytes_transferred = session.bytes_transferred;
        session.cancel(reason.clone());

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
        let sessions = self.sessions.read().await;
        let session = sessions.get(transfer_id)
            .ok_or_else(|| TransferError::Unknown {
                message: format!("Transfer session not found: {}", transfer_id),
                context: Some(transfer_id.to_string()),
            })?;

        Ok(session.progress.clone())
    }

    /// Get all active transfers
    pub async fn get_active_transfers(&self) -> Vec<TransferSession> {
        let sessions = self.sessions.read().await;
        sessions.values()
            .filter(|session| session.is_active())
            .cloned()
            .collect()
    }

    /// Get transfer history
    pub async fn get_transfer_history(&self) -> Vec<TransferSession> {
        let sessions = self.sessions.read().await;
        sessions.values()
            .filter(|session| session.is_terminal())
            .cloned()
            .collect()
    }

    /// Remove completed transfers from memory
    pub async fn cleanup_completed_transfers(&self) -> usize {
        let mut sessions = self.sessions.write().await;
        let initial_count = sessions.len();
        
        // Keep only active transfers and recent completed ones (last 100)
        let mut completed: Vec<_> = sessions.values()
            .filter(|s| s.is_terminal())
            .cloned()
            .collect();
        
        completed.sort_by(|a, b| {
            b.end_time.unwrap_or(Instant::now())
                .cmp(&a.end_time.unwrap_or(Instant::now()))
        });

        // Keep only the 100 most recent completed transfers
        let to_remove: Vec<String> = completed.iter()
            .skip(100)
            .map(|s| s.id.clone())
            .collect();

        for id in &to_remove {
            sessions.remove(id);
        }

        initial_count - sessions.len()
    }

    // Private implementation methods
    async fn execute_transfer(
        transfer_id: String,
        config: TransferConfig,
        file_path: PathBuf,
        target_address: String,
        sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
        _event_emitter: Arc<dyn EventEmitter>,
        progress_sender: mpsc::UnboundedSender<TransferProgressUpdate>,
        metrics_collector: Arc<MetricsCollector>,
        cancellation_flag: Arc<AtomicBool>,
        retry_handler: RetryHandler,
    ) -> Result<TransferResult, TransferError> {
        let target_addr: SocketAddr = target_address.parse()
            .map_err(|e| TransferError::ConfigError {
                message: format!("Invalid target address: {}", e),
                field: Some("target_address".to_string()),
            })?;

        // Create progress tracking channel
        let (progress_tx, mut progress_rx) = mpsc::unbounded_channel::<TransferProgressUpdate>();

        // Start progress monitoring task
        let progress_task = {
            let transfer_id_clone = transfer_id.clone();
            let progress_sender_clone = progress_sender.clone();
            let sessions_clone = Arc::clone(&sessions);
            
            tokio::spawn(async move {
                while let Some(update) = progress_rx.recv().await {
                    // Update session
                    {
                        let mut sessions = sessions_clone.write().await;
                        if let Some(session) = sessions.get_mut(&transfer_id_clone) {
                            let speed = update.speed;
                            let eta = update.eta;
                            session.update_progress(update.bytes_transferred, speed, eta);
                        }
                    }

                    // Forward to orchestrator
                    let _ = progress_sender_clone.send(TransferProgressUpdate {
                        transfer_id: transfer_id_clone.clone(),
                        bytes_transferred: update.bytes_transferred,
                        total_bytes: update.total_bytes,
                        speed: update.speed,
                        eta: update.eta,
                    });
                }
            })
        };

        // Execute transfer with retry logic
        let result = retry_handler.retry_with_backoff(|| async {
            // Check for cancellation
            if cancellation_flag.load(Ordering::SeqCst) {
                return Err(TransferError::Cancelled { transfer_id: transfer_id.clone() });
            }

            match config.protocol {
                Protocol::Tcp => {
                    Self::execute_tcp_transfer(
                        &config,
                        &file_path,
                        target_addr,
                        progress_tx.clone(),
                        Arc::clone(&cancellation_flag),
                    ).await
                }
                Protocol::Udp => {
                    Self::execute_udp_transfer(
                        &config,
                        &file_path,
                        target_addr,
                        progress_tx.clone(),
                        Arc::clone(&cancellation_flag),
                    ).await
                }
            }
        }).await;

        // Stop progress monitoring
        drop(progress_tx);
        let _ = progress_task.await;

        // Record metrics
        if let Ok(ref transfer_result) = result {
            metrics_collector.record_transfer(
                &transfer_id,
                &config.protocol,
                transfer_result.bytes_transferred,
                transfer_result.duration,
                true,
            ).await;
        } else {
            metrics_collector.record_transfer(
                &transfer_id,
                &config.protocol,
                0,
                Duration::from_secs(0),
                false,
            ).await;
        }

        result
    }

    async fn execute_receiver(
        transfer_id: String,
        config: TransferConfig,
        port: u16,
        output_dir: PathBuf,
        sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
        _event_emitter: Arc<dyn EventEmitter>,
        progress_sender: mpsc::UnboundedSender<TransferProgressUpdate>,
        metrics_collector: Arc<MetricsCollector>,
        cancellation_flag: Arc<AtomicBool>,
        retry_handler: RetryHandler,
    ) -> Result<TransferResult, TransferError> {
        let bind_addr = SocketAddr::from(([0, 0, 0, 0], port));

        // Create progress tracking channel
        let (progress_tx, mut progress_rx) = mpsc::unbounded_channel::<TransferProgressUpdate>();

        // Start progress monitoring task
        let progress_task = {
            let transfer_id_clone = transfer_id.clone();
            let progress_sender_clone = progress_sender.clone();
            let sessions_clone = Arc::clone(&sessions);
            
            tokio::spawn(async move {
                while let Some(update) = progress_rx.recv().await {
                    // Update session
                    {
                        let mut sessions = sessions_clone.write().await;
                        if let Some(session) = sessions.get_mut(&transfer_id_clone) {
                            let speed = update.speed;
                            let eta = update.eta;
                            session.update_progress(update.bytes_transferred, speed, eta);
                        }
                    }

                    // Forward to orchestrator
                    let _ = progress_sender_clone.send(TransferProgressUpdate {
                        transfer_id: transfer_id_clone.clone(),
                        bytes_transferred: update.bytes_transferred,
                        total_bytes: update.total_bytes,
                        speed: update.speed,
                        eta: update.eta,
                    });
                }
            })
        };

        // Execute receiver with retry logic
        let result = retry_handler.retry_with_backoff(|| async {
            // Check for cancellation
            if cancellation_flag.load(Ordering::SeqCst) {
                return Err(TransferError::Cancelled { transfer_id: transfer_id.clone() });
            }

            match config.protocol {
                Protocol::Tcp => {
                    Self::execute_tcp_receiver(
                        &config,
                        bind_addr,
                        &output_dir,
                        progress_tx.clone(),
                        Arc::clone(&cancellation_flag),
                    ).await
                }
                Protocol::Udp => {
                    Self::execute_udp_receiver(
                        &config,
                        bind_addr,
                        &output_dir,
                        progress_tx.clone(),
                        Arc::clone(&cancellation_flag),
                    ).await
                }
            }
        }).await;

        // Stop progress monitoring
        drop(progress_tx);
        let _ = progress_task.await;

        // Record metrics
        if let Ok(ref transfer_result) = result {
            metrics_collector.record_transfer(
                &transfer_id,
                &config.protocol,
                transfer_result.bytes_transferred,
                transfer_result.duration,
                true,
            ).await;
        } else {
            metrics_collector.record_transfer(
                &transfer_id,
                &config.protocol,
                0,
                Duration::from_secs(0),
                false,
            ).await;
        }

        result
    }

    async fn execute_tcp_transfer(
        config: &TransferConfig,
        file_path: &PathBuf,
        target_addr: SocketAddr,
        _progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let mut tcp_transfer = TcpTransfer::new(config.clone());
        
        // Connect with timeout
        tcp_transfer.connect(target_addr).await?;

        // Set up progress tracking
        let _file_size = tokio::fs::metadata(file_path).await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to read file metadata: {}", e),
                file_path: Some(file_path.display().to_string()),
                recoverable: false,
            })?.len();

        // Execute transfer with cancellation support
        let transfer_future = tcp_transfer.send_file(file_path.clone());
        
        tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: tcp_transfer.transfer_id().to_string() 
                })
            }
        }
    }

    async fn execute_udp_transfer(
        config: &TransferConfig,
        file_path: &PathBuf,
        target_addr: SocketAddr,
        progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let mut udp_transfer = UdpTransfer::new(config.clone());
        
        // Bind to local address
        let local_addr = SocketAddr::from(([0, 0, 0, 0], 0));
        udp_transfer.bind(local_addr).await?;

        // Set up progress tracking similar to TCP
        let file_size = tokio::fs::metadata(file_path).await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to read file metadata: {}", e),
                file_path: Some(file_path.display().to_string()),
                recoverable: false,
            })?.len();

        // Create progress sender for UDP transfer
        let (udp_progress_tx, mut udp_progress_rx) = mpsc::unbounded_channel();
        udp_transfer.set_progress_sender(udp_progress_tx);

        // Forward UDP progress to main progress channel
        let progress_forward_task = {
            let progress_tx_clone = progress_tx.clone();
            tokio::spawn(async move {
                while let Some(progress) = udp_progress_rx.recv().await {
                    let _ = progress_tx_clone.send(TransferProgressUpdate {
                        transfer_id: progress.transfer_id,
                        bytes_transferred: (progress.progress * file_size as f64) as u64,
                        total_bytes: file_size,
                        speed: progress.speed,
                        eta: progress.eta,
                    });
                }
            })
        };

        // Execute transfer with cancellation support
        let transfer_future = udp_transfer.send_file(file_path.clone(), target_addr);
        
        let result = tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: "udp_transfer".to_string() 
                })
            }
        };

        // Clean up progress forwarding
        let _ = progress_forward_task.await;

        result
    }

    async fn execute_tcp_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: &PathBuf,
        _progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let listener = TcpTransfer::listen(bind_addr).await?;
        
        // Accept connection with timeout
        let (stream, _peer_addr) = TcpTransfer::accept_connection(&listener, config.timeout).await?;
        
        let mut tcp_transfer = TcpTransfer::new(config.clone());
        tcp_transfer.set_socket(stream);

        // Execute receive with cancellation support
        let transfer_future = tcp_transfer.receive_file(output_dir.clone());
        
        tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: tcp_transfer.transfer_id().to_string() 
                })
            }
        }
    }

    async fn execute_udp_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: &PathBuf,
        progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let mut udp_transfer = UdpTransfer::new(config.clone());
        udp_transfer.bind(bind_addr).await?;

        // Set up progress tracking
        let (udp_progress_tx, mut udp_progress_rx) = mpsc::unbounded_channel();
        udp_transfer.set_progress_sender(udp_progress_tx);

        // Forward UDP progress to main progress channel
        let progress_forward_task = {
            let progress_tx_clone = progress_tx.clone();
            tokio::spawn(async move {
                while let Some(progress) = udp_progress_rx.recv().await {
                    let _ = progress_tx_clone.send(TransferProgressUpdate {
                        transfer_id: progress.transfer_id,
                        bytes_transferred: (progress.progress * 1000000.0) as u64, // Estimate
                        total_bytes: 1000000, // Will be updated when we know actual size
                        speed: progress.speed,
                        eta: progress.eta,
                    });
                }
            })
        };

        // Execute receive with cancellation support
        let transfer_future = udp_transfer.receive_file(output_dir.clone());
        
        let result = tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: "udp_receiver".to_string() 
                })
            }
        };

        // Clean up progress forwarding
        let _ = progress_forward_task.await;

        result
    }

    async fn handle_transfer_completion(
        transfer_id: String,
        result: Result<TransferResult, TransferError>,
        sessions: Arc<RwLock<HashMap<String, TransferSession>>>,
        event_emitter: Arc<dyn EventEmitter>,
        state_persistence: Arc<StatePersistence>,
    ) {
        let mut sessions = sessions.write().await;
        if let Some(session) = sessions.get_mut(&transfer_id) {
            match result {
                Ok(transfer_result) => {
                    session.complete(transfer_result.checksum.clone());
                    
                    // Emit completion event
                    let completed_event = EventBuilder::completed_event(
                        transfer_id.clone(),
                        transfer_result.bytes_transferred,
                        transfer_result.duration.as_millis() as u64,
                        transfer_result.checksum,
                        session.config.protocol.to_string(),
                    );
                    event_emitter.emit_completed(completed_event);
                }
                Err(error) => {
                    session.fail(error.to_string());
                    
                    // Emit error event
                    let error_event = EventBuilder::error_event(transfer_id.clone(), &error);
                    event_emitter.emit_error(error_event);
                }
            }

            // Persist session state
            let _ = state_persistence.save_session(session).await;
        }
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
            ).await;
        }
    }

    async fn cleanup_task(sessions: Arc<RwLock<HashMap<String, TransferSession>>>) {
        let mut interval = interval(Duration::from_secs(300)); // Cleanup every 5 minutes
        
        loop {
            interval.tick().await;
            
            let mut sessions = sessions.write().await;
            let initial_count = sessions.len();
            
            // Remove sessions that have been completed for more than 1 hour
            let cutoff_time = Instant::now() - Duration::from_secs(3600);
            sessions.retain(|_, session| {
                if let Some(end_time) = session.end_time {
                    end_time > cutoff_time || session.is_active()
                } else {
                    true // Keep active or never-started sessions
                }
            });
            
            let removed_count = initial_count - sessions.len();
            if removed_count > 0 {
                debug!("Cleaned up {} old transfer sessions", removed_count);
            }
        }
    }

    async fn load_persisted_state(&self) -> Result<(), TransferError> {
        match self.state_persistence.load_sessions().await {
            Ok(persisted_sessions) => {
                let mut sessions = self.sessions.write().await;
                for session in persisted_sessions {
                    // Only restore completed sessions for history
                    if session.is_terminal() {
                        sessions.insert(session.id.clone(), session);
                    }
                }
                info!("Loaded {} persisted transfer sessions", sessions.len());
                Ok(())
            }
            Err(e) => {
                warn!("Failed to load persisted state: {}", e);
                Ok(()) // Don't fail startup if we can't load state
            }
        }
    }
}

/// Metrics collector for transfer statistics
pub struct MetricsCollector {
    transfer_metrics: Arc<Mutex<HashMap<String, TransferMetrics>>>,
}

#[derive(Debug, Clone)]
struct TransferMetrics {
    transfer_id: String,
    protocol: Protocol,
    start_time: Instant,
    bytes_transferred: u64,
    current_speed: f64,
    peak_speed: f64,
    success: bool,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            transfer_metrics: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn record_transfer(
        &self,
        transfer_id: &str,
        protocol: &Protocol,
        bytes_transferred: u64,
        duration: Duration,
        success: bool,
    ) {
        let mut metrics = self.transfer_metrics.lock().await;
        if let Some(transfer_metrics) = metrics.get_mut(transfer_id) {
            transfer_metrics.bytes_transferred = bytes_transferred;
            transfer_metrics.success = success;
        } else {
            metrics.insert(transfer_id.to_string(), TransferMetrics {
                transfer_id: transfer_id.to_string(),
                protocol: protocol.clone(),
                start_time: Instant::now() - duration,
                bytes_transferred,
                current_speed: if duration.as_secs_f64() > 0.0 {
                    bytes_transferred as f64 / duration.as_secs_f64()
                } else {
                    0.0
                },
                peak_speed: 0.0,
                success,
            });
        }
    }

    pub async fn update_transfer_progress(
        &self,
        transfer_id: &str,
        bytes_transferred: u64,
        speed: f64,
    ) {
        let mut metrics = self.transfer_metrics.lock().await;
        if let Some(transfer_metrics) = metrics.get_mut(transfer_id) {
            transfer_metrics.bytes_transferred = bytes_transferred;
            transfer_metrics.current_speed = speed;
            if speed > transfer_metrics.peak_speed {
                transfer_metrics.peak_speed = speed;
            }
        }
    }

    pub async fn get_metrics(&self, transfer_id: &str) -> Option<TransferMetrics> {
        let metrics = self.transfer_metrics.lock().await;
        metrics.get(transfer_id).cloned()
    }
}

/// State persistence for transfer sessions
pub struct StatePersistence {
    storage_path: PathBuf,
}

impl StatePersistence {
    pub fn new() -> Self {
        let storage_path = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("file-transfer-app")
            .join("sessions.json");

        Self { storage_path }
    }

    pub async fn save_session(&self, session: &TransferSession) -> Result<(), TransferError> {
        // Create directory if it doesn't exist
        if let Some(parent) = self.storage_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .map_err(|e| TransferError::FileError {
                    message: format!("Failed to create storage directory: {}", e),
                    file_path: Some(parent.display().to_string()),
                    recoverable: false,
                })?;
        }

        // Load existing sessions
        let mut sessions = self.load_sessions().await.unwrap_or_default();
        
        // Update or add the session
        sessions.retain(|s| s.id != session.id);
        sessions.push(session.clone());

        // Keep only the last 1000 sessions
        if sessions.len() > 1000 {
            sessions.sort_by(|a, b| {
                b.end_time.unwrap_or(Instant::now())
                    .cmp(&a.end_time.unwrap_or(Instant::now()))
            });
            sessions.truncate(1000);
        }

        // Convert to serializable format
        let serializable_sessions: Vec<SerializableTransferSession> = sessions
            .iter()
            .map(|s| s.into())
            .collect();

        // Save to file
        let serialized = serde_json::to_string_pretty(&serializable_sessions)
            .map_err(|e| TransferError::Unknown {
                message: format!("Failed to serialize sessions: {}", e),
                context: None,
            })?;

        tokio::fs::write(&self.storage_path, serialized).await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to save sessions: {}", e),
                file_path: Some(self.storage_path.display().to_string()),
                recoverable: false,
            })?;

        Ok(())
    }

    pub async fn load_sessions(&self) -> Result<Vec<TransferSession>, TransferError> {
        if !self.storage_path.exists() {
            return Ok(Vec::new());
        }

        let content = tokio::fs::read_to_string(&self.storage_path).await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to read sessions file: {}", e),
                file_path: Some(self.storage_path.display().to_string()),
                recoverable: false,
            })?;

        let serializable_sessions: Vec<SerializableTransferSession> = serde_json::from_str(&content)
            .map_err(|e| TransferError::Unknown {
                message: format!("Failed to deserialize sessions: {}", e),
                context: Some(self.storage_path.display().to_string()),
            })?;

        Ok(serializable_sessions.into_iter().map(|s| s.into()).collect())
    }
}

// Custom serialization for TransferSession
#[derive(Serialize, Deserialize)]
struct SerializableTransferSession {
    id: String,
    config: TransferConfig,
    file_path: Option<PathBuf>,
    target_address: Option<String>,
    status: TransferStatus,
    progress: TransferProgress,
    start_time_secs: Option<u64>,
    end_time_secs: Option<u64>,
    bytes_transferred: u64,
    total_bytes: u64,
    error: Option<String>,
    checksum: Option<String>,
}

impl From<&TransferSession> for SerializableTransferSession {
    fn from(session: &TransferSession) -> Self {
        Self {
            id: session.id.clone(),
            config: session.config.clone(),
            file_path: session.file_path.clone(),
            target_address: session.target_address.clone(),
            status: session.status.clone(),
            progress: session.progress.clone(),
            start_time_secs: session.start_time.map(|t| t.elapsed().as_secs()),
            end_time_secs: session.end_time.map(|t| t.elapsed().as_secs()),
            bytes_transferred: session.bytes_transferred,
            total_bytes: session.total_bytes,
            error: session.error.clone(),
            checksum: session.checksum.clone(),
        }
    }
}

impl From<SerializableTransferSession> for TransferSession {
    fn from(serializable: SerializableTransferSession) -> Self {
        let now = Instant::now();
        Self {
            id: serializable.id,
            config: serializable.config,
            file_path: serializable.file_path,
            target_address: serializable.target_address,
            status: serializable.status,
            progress: serializable.progress,
            start_time: serializable.start_time_secs.map(|s| now - Duration::from_secs(s)),
            end_time: serializable.end_time_secs.map(|s| now - Duration::from_secs(s)),
            bytes_transferred: serializable.bytes_transferred,
            total_bytes: serializable.total_bytes,
            error: serializable.error,
            checksum: serializable.checksum,
            cancellation_flag: Arc::new(AtomicBool::new(false)),
        }
    }
}