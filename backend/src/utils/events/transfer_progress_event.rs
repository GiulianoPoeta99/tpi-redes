// Transfer progress event structure
use serde::{Deserialize, Serialize};

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