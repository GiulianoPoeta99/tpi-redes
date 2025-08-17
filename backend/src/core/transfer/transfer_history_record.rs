use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

use crate::config::Protocol;
use crate::core::transfer::network_log_entry::NetworkLogEntry;

/// Complete transfer record with all details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferHistoryRecord {
    pub id: String,
    pub filename: String,
    pub file_size: u64,
    pub mode: TransferMode,
    pub protocol: Protocol,
    pub target_address: String,
    pub status: TransferHistoryStatus,
    pub timestamp: u64,
    pub duration: Duration,
    pub bytes_transferred: u64,
    pub checksum: String,
    pub error_message: Option<String>,
    pub network_logs: Vec<NetworkLogEntry>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferMode {
    Sent,
    Received,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferHistoryStatus {
    Completed,
    Failed,
    Cancelled,
}