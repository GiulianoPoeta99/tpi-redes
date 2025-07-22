// Transfer cancelled event structure
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferCancelledEvent {
    pub transfer_id: String,
    pub reason: String,
    pub bytes_transferred: u64,
    pub timestamp: u64,
}