// Transfer error event structure
use serde::{Deserialize, Serialize};

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