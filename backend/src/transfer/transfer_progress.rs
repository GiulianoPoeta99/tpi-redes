use crate::transfer::transfer_status::TransferStatus;
use serde::{Deserialize, Serialize};

/// Progress information for a file transfer
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