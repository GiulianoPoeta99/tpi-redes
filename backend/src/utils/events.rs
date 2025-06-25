// Event handling utilities for Tauri integration
use crate::transfer::{TransferProgress, TransferResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferProgressEvent {
    pub transfer_id: String,
    pub progress: f64,
    pub speed: f64,
    pub eta: u64,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferErrorEvent {
    pub transfer_id: String,
    pub error: String,
    pub error_code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferCompletedEvent {
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: u64,
    pub checksum: String,
}

// Event emission will be implemented when Tauri integration is added
pub trait EventEmitter {
    fn emit_progress(&self, event: TransferProgressEvent);
    fn emit_error(&self, event: TransferErrorEvent);
    fn emit_completed(&self, event: TransferCompletedEvent);
}

// Placeholder implementation - will be replaced with Tauri event emitter
pub struct NoOpEventEmitter;

impl EventEmitter for NoOpEventEmitter {
    fn emit_progress(&self, _event: TransferProgressEvent) {
        // No-op for now
    }
    
    fn emit_error(&self, _event: TransferErrorEvent) {
        // No-op for now
    }
    
    fn emit_completed(&self, _event: TransferCompletedEvent) {
        // No-op for now
    }
}