use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::config::Protocol;
use crate::core::transfer::network_log_entry::NetworkLogEntry;
use crate::core::transfer::transfer_history_record::{TransferHistoryRecord, TransferMode, TransferHistoryStatus};

/// Helper function to create a transfer history record from transfer result
pub fn create_history_record(
    transfer_id: String,
    filename: String,
    file_size: u64,
    mode: TransferMode,
    protocol: Protocol,
    target_address: String,
    status: TransferHistoryStatus,
    duration: Duration,
    bytes_transferred: u64,
    checksum: String,
    error_message: Option<String>,
    network_logs: Vec<NetworkLogEntry>,
) -> TransferHistoryRecord {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_millis() as u64;

    let mut metadata = HashMap::new();
    metadata.insert("created_at".to_string(), timestamp.to_string());
    
    TransferHistoryRecord {
        id: transfer_id,
        filename,
        file_size,
        mode,
        protocol,
        target_address,
        status,
        timestamp,
        duration,
        bytes_transferred,
        checksum,
        error_message,
        network_logs,
        metadata,
    }
}