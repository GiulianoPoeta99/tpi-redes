// Connection event structure
use serde::{Deserialize, Serialize};

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