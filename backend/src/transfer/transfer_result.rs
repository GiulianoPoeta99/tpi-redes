use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Result of a completed file transfer operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferResult {
    pub success: bool,
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: Duration,
    pub checksum: String,
    pub error: Option<String>,
}

impl TransferResult {
    /// Creates a successful transfer result
    pub fn success(
        transfer_id: String,
        bytes_transferred: u64,
        duration: Duration,
        checksum: String,
    ) -> Self {
        Self {
            success: true,
            transfer_id,
            bytes_transferred,
            duration,
            checksum,
            error: None,
        }
    }
    
    /// Creates a failed transfer result
    pub fn failure(transfer_id: String, error: String) -> Self {
        Self {
            success: false,
            transfer_id,
            bytes_transferred: 0,
            duration: Duration::from_secs(0),
            checksum: String::new(),
            error: Some(error),
        }
    }
    
    /// Returns the average transfer speed in bytes per second
    pub fn average_speed(&self) -> f64 {
        if self.duration.as_secs_f64() > 0.0 {
            self.bytes_transferred as f64 / self.duration.as_secs_f64()
        } else {
            0.0
        }
    }
    
    /// Returns the transfer speed in a human-readable format
    pub fn speed_human_readable(&self) -> String {
        let speed = self.average_speed();
        if speed < 1024.0 {
            format!("{:.1} B/s", speed)
        } else if speed < 1024.0 * 1024.0 {
            format!("{:.1} KB/s", speed / 1024.0)
        } else if speed < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.1} MB/s", speed / (1024.0 * 1024.0))
        } else {
            format!("{:.1} GB/s", speed / (1024.0 * 1024.0 * 1024.0))
        }
    }
    
    /// Returns the bytes transferred in a human-readable format
    pub fn bytes_human_readable(&self) -> String {
        let bytes = self.bytes_transferred as f64;
        if bytes < 1024.0 {
            format!("{} B", self.bytes_transferred)
        } else if bytes < 1024.0 * 1024.0 {
            format!("{:.1} KB", bytes / 1024.0)
        } else if bytes < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.1} MB", bytes / (1024.0 * 1024.0))
        } else {
            format!("{:.1} GB", bytes / (1024.0 * 1024.0 * 1024.0))
        }
    }
}