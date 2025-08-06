// File transfer logic module
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub progress: f64,        // 0.0 - 1.0
    pub speed: f64,           // bytes per second
    pub eta: u64,             // seconds remaining
    pub status: TransferStatus,
    pub error: Option<String>,
}

impl TransferProgress {
    /// Creates a new transfer progress with initial values
    pub fn new(transfer_id: String) -> Self {
        Self {
            transfer_id,
            progress: 0.0,
            speed: 0.0,
            eta: 0,
            status: TransferStatus::Idle,
            error: None,
        }
    }
    
    /// Updates the progress with new values
    pub fn update(&mut self, progress: f64, speed: f64, eta: u64) {
        self.progress = progress.clamp(0.0, 1.0);
        self.speed = speed.max(0.0);
        self.eta = eta;
        
        if self.progress >= 1.0 && self.status == TransferStatus::Transferring {
            self.status = TransferStatus::Completed;
        }
    }
    
    /// Sets an error state
    pub fn set_error(&mut self, error: String) {
        self.status = TransferStatus::Error;
        self.error = Some(error);
    }
    
    /// Returns the progress as a percentage (0-100)
    pub fn progress_percentage(&self) -> f64 {
        self.progress * 100.0
    }
    
    /// Returns the speed in a human-readable format
    pub fn speed_human_readable(&self) -> String {
        if self.speed < 1024.0 {
            format!("{:.1} B/s", self.speed)
        } else if self.speed < 1024.0 * 1024.0 {
            format!("{:.1} KB/s", self.speed / 1024.0)
        } else if self.speed < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.1} MB/s", self.speed / (1024.0 * 1024.0))
        } else {
            format!("{:.1} GB/s", self.speed / (1024.0 * 1024.0 * 1024.0))
        }
    }
    
    /// Returns the ETA in a human-readable format
    pub fn eta_human_readable(&self) -> String {
        if self.eta == 0 {
            return "Unknown".to_string();
        }
        
        let hours = self.eta / 3600;
        let minutes = (self.eta % 3600) / 60;
        let seconds = self.eta % 60;
        
        if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, seconds)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, seconds)
        } else {
            format!("{}s", seconds)
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransferStatus {
    Idle,
    Connecting,
    Transferring,
    Completed,
    Error,
}

impl std::fmt::Display for TransferStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferStatus::Idle => write!(f, "idle"),
            TransferStatus::Connecting => write!(f, "connecting"),
            TransferStatus::Transferring => write!(f, "transferring"),
            TransferStatus::Completed => write!(f, "completed"),
            TransferStatus::Error => write!(f, "error"),
        }
    }
}

impl TransferStatus {
    /// Returns true if the transfer is in a terminal state (completed or error)
    pub fn is_terminal(&self) -> bool {
        matches!(self, TransferStatus::Completed | TransferStatus::Error)
    }
    
    /// Returns true if the transfer is currently active
    pub fn is_active(&self) -> bool {
        matches!(self, TransferStatus::Connecting | TransferStatus::Transferring)
    }
}

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

// File chunking functionality
pub struct FileChunker {
    chunk_size: usize,
    total_chunks: usize,
}

impl FileChunker {
    pub fn new(file_size: u64, chunk_size: usize) -> Self {
        let total_chunks = ((file_size as f64) / (chunk_size as f64)).ceil() as usize;
        Self {
            chunk_size,
            total_chunks,
        }
    }
    
    pub async fn read_chunk(&mut self, chunk_id: u32) -> Result<Vec<u8>, crate::utils::errors::TransferError> {
        // Implementation will be added in task 4
        todo!("Implementation in task 4")
    }
    
    pub async fn write_chunk(&mut self, chunk_id: u32, data: Vec<u8>) -> Result<(), crate::utils::errors::TransferError> {
        // Implementation will be added in task 4
        todo!("Implementation in task 4")
    }
}

// Protocol messages
#[derive(Serialize, Deserialize)]
pub enum ProtocolMessage {
    Handshake { filename: String, size: u64, checksum: String },
    HandshakeAck { accepted: bool, reason: Option<String> },
    DataChunk { sequence: u32, data: Vec<u8> },
    DataAck { sequence: u32, status: AckStatus },
    TransferComplete { checksum: String },
    Error { code: String, message: String },
}

#[derive(Serialize, Deserialize)]
pub enum AckStatus {
    Ok,
    Retry,
    Error,
}



