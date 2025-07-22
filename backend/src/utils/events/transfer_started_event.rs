// Transfer started event structure
use serde::{Deserialize, Serialize};

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