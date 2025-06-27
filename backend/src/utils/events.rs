// Event handling utilities for Tauri integration
use crate::utils::errors::TransferError;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::{debug, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgressEvent {
    pub transfer_id: String,
    pub progress: f64,
    pub speed: f64,
    pub eta: u64,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub timestamp: u64, // Unix timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferErrorEvent {
    pub transfer_id: String,
    pub error: String,
    pub error_code: String,
    pub recoverable: bool,
    pub context: Option<String>,
    pub recovery_suggestion: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferCompletedEvent {
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: u64,
    pub checksum: String,
    pub protocol: String,
    pub throughput_mbps: f64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferStartedEvent {
    pub transfer_id: String,
    pub filename: String,
    pub file_size: u64,
    pub target: String,
    pub protocol: String,
    pub mode: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferCancelledEvent {
    pub transfer_id: String,
    pub reason: String,
    pub bytes_transferred: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionEvent {
    pub transfer_id: Option<String>,
    pub event_type: String, // "connecting", "connected", "disconnected", "failed"
    pub address: String,
    pub protocol: String,
    pub success: bool,
    pub error: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TransferEvent {
    Started(TransferStartedEvent),
    Progress(TransferProgressEvent),
    Error(TransferErrorEvent),
    Completed(TransferCompletedEvent),
    Cancelled(TransferCancelledEvent),
    Connection(ConnectionEvent),
}

impl TransferEvent {
    pub fn transfer_id(&self) -> Option<&str> {
        match self {
            TransferEvent::Started(e) => Some(&e.transfer_id),
            TransferEvent::Progress(e) => Some(&e.transfer_id),
            TransferEvent::Error(e) => Some(&e.transfer_id),
            TransferEvent::Completed(e) => Some(&e.transfer_id),
            TransferEvent::Cancelled(e) => Some(&e.transfer_id),
            TransferEvent::Connection(e) => e.transfer_id.as_deref(),
        }
    }

    pub fn timestamp(&self) -> u64 {
        match self {
            TransferEvent::Started(e) => e.timestamp,
            TransferEvent::Progress(e) => e.timestamp,
            TransferEvent::Error(e) => e.timestamp,
            TransferEvent::Completed(e) => e.timestamp,
            TransferEvent::Cancelled(e) => e.timestamp,
            TransferEvent::Connection(e) => e.timestamp,
        }
    }
}

// Event emission trait for different backends (Tauri, CLI, etc.)
pub trait EventEmitter: Send + Sync {
    fn emit_event(&self, event: TransferEvent);
    
    fn emit_progress(&self, event: TransferProgressEvent) {
        self.emit_event(TransferEvent::Progress(event));
    }
    
    fn emit_error(&self, event: TransferErrorEvent) {
        self.emit_event(TransferEvent::Error(event));
    }
    
    fn emit_completed(&self, event: TransferCompletedEvent) {
        self.emit_event(TransferEvent::Completed(event));
    }
    
    fn emit_started(&self, event: TransferStartedEvent) {
        self.emit_event(TransferEvent::Started(event));
    }
    
    fn emit_cancelled(&self, event: TransferCancelledEvent) {
        self.emit_event(TransferEvent::Cancelled(event));
    }
    
    fn emit_connection(&self, event: ConnectionEvent) {
        self.emit_event(TransferEvent::Connection(event));
    }
}

// Broadcast-based event emitter for internal use
pub struct BroadcastEventEmitter {
    sender: broadcast::Sender<TransferEvent>,
}

impl BroadcastEventEmitter {
    pub fn new(capacity: usize) -> (Self, broadcast::Receiver<TransferEvent>) {
        let (sender, receiver) = broadcast::channel(capacity);
        (Self { sender }, receiver)
    }

    pub fn subscribe(&self) -> broadcast::Receiver<TransferEvent> {
        self.sender.subscribe()
    }
}

impl EventEmitter for BroadcastEventEmitter {
    fn emit_event(&self, event: TransferEvent) {
        debug!("Emitting event: {:?}", event);
        if let Err(e) = self.sender.send(event) {
            error!("Failed to emit event: {}", e);
        }
    }
}

// No-op implementation for testing or when events are not needed
pub struct NoOpEventEmitter;

impl EventEmitter for NoOpEventEmitter {
    fn emit_event(&self, _event: TransferEvent) {
        // No-op
    }
}

// Console event emitter for CLI usage
pub struct ConsoleEventEmitter {
    verbose: bool,
}

impl ConsoleEventEmitter {
    pub fn new(verbose: bool) -> Self {
        Self { verbose }
    }
}

impl EventEmitter for ConsoleEventEmitter {
    fn emit_event(&self, event: TransferEvent) {
        match event {
            TransferEvent::Started(e) => {
                println!("🚀 Starting transfer: {} -> {}", e.filename, e.target);
            }
            TransferEvent::Progress(e) => {
                if self.verbose || e.progress % 0.1 < 0.01 { // Show every 10% or if verbose
                    println!(
                        "📊 Progress: {:.1}% ({:.2} MB/s, ETA: {}s)",
                        e.progress * 100.0,
                        e.speed / 1_000_000.0,
                        e.eta
                    );
                }
            }
            TransferEvent::Completed(e) => {
                println!(
                    "✅ Transfer completed: {} bytes in {:.2}s ({:.2} MB/s)",
                    e.bytes_transferred,
                    e.duration as f64 / 1000.0,
                    e.throughput_mbps
                );
            }
            TransferEvent::Error(e) => {
                eprintln!("❌ Transfer failed: {}", e.error);
                if let Some(suggestion) = e.recovery_suggestion {
                    eprintln!("💡 Suggestion: {}", suggestion);
                }
            }
            TransferEvent::Cancelled(e) => {
                println!("⏹️  Transfer cancelled: {}", e.reason);
            }
            TransferEvent::Connection(e) => {
                if self.verbose {
                    if e.success {
                        println!("🔗 Connection {}: {}", e.event_type, e.address);
                    } else {
                        eprintln!("🔌 Connection failed: {} to {}", e.event_type, e.address);
                    }
                }
            }
        }
    }
}

// Event builder utilities
pub struct EventBuilder;

impl EventBuilder {
    pub fn progress_event(
        transfer_id: String,
        progress: f64,
        speed: f64,
        eta: u64,
        bytes_transferred: u64,
        total_bytes: u64,
    ) -> TransferProgressEvent {
        TransferProgressEvent {
            transfer_id,
            progress,
            speed,
            eta,
            bytes_transferred,
            total_bytes,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn error_event(transfer_id: String, error: &TransferError) -> TransferErrorEvent {
        use crate::utils::errors::ErrorRecovery;
        
        TransferErrorEvent {
            transfer_id,
            error: error.to_string(),
            error_code: error.error_code().to_string(),
            recoverable: error.is_recoverable(),
            context: error.get_context(),
            recovery_suggestion: ErrorRecovery::get_recovery_suggestion(error),
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn completed_event(
        transfer_id: String,
        bytes_transferred: u64,
        duration: u64,
        checksum: String,
        protocol: String,
    ) -> TransferCompletedEvent {
        let throughput_mbps = if duration > 0 {
            (bytes_transferred as f64 / (duration as f64 / 1000.0)) / 1_000_000.0
        } else {
            0.0
        };

        TransferCompletedEvent {
            transfer_id,
            bytes_transferred,
            duration,
            checksum,
            protocol,
            throughput_mbps,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn started_event(
        transfer_id: String,
        filename: String,
        file_size: u64,
        target: String,
        protocol: String,
        mode: String,
    ) -> TransferStartedEvent {
        TransferStartedEvent {
            transfer_id,
            filename,
            file_size,
            target,
            protocol,
            mode,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn cancelled_event(
        transfer_id: String,
        reason: String,
        bytes_transferred: u64,
    ) -> TransferCancelledEvent {
        TransferCancelledEvent {
            transfer_id,
            reason,
            bytes_transferred,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn connection_event(
        transfer_id: Option<String>,
        event_type: String,
        address: String,
        protocol: String,
        success: bool,
        error: Option<String>,
    ) -> ConnectionEvent {
        ConnectionEvent {
            transfer_id,
            event_type,
            address,
            protocol,
            success,
            error,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }
}

// Event aggregator for collecting and processing events
pub struct EventAggregator {
    events: Arc<tokio::sync::Mutex<Vec<TransferEvent>>>,
    max_events: usize,
}

impl EventAggregator {
    pub fn new(max_events: usize) -> Self {
        Self {
            events: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            max_events,
        }
    }

    pub async fn add_event(&self, event: TransferEvent) {
        let mut events = self.events.lock().await;
        events.push(event);
        
        // Keep only the most recent events
        if events.len() > self.max_events {
            let excess = events.len() - self.max_events;
            events.drain(0..excess);
        }
    }

    pub async fn get_events(&self) -> Vec<TransferEvent> {
        self.events.lock().await.clone()
    }

    pub async fn get_events_for_transfer(&self, transfer_id: &str) -> Vec<TransferEvent> {
        self.events
            .lock()
            .await
            .iter()
            .filter(|event| event.transfer_id() == Some(transfer_id))
            .cloned()
            .collect()
    }

    pub async fn clear_events(&self) {
        self.events.lock().await.clear();
    }
}