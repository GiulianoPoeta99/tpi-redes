// Transfer completed event structure
use serde::{Deserialize, Serialize};

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