// Transfer session information
use crate::config::TransferConfig;
use crate::core::transfer::{TransferProgress, TransferStatus};
use std::path::PathBuf;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct TransferSession {
    pub id: String,
    pub config: TransferConfig,
    pub file_path: Option<PathBuf>,
    pub target_address: Option<String>,
    pub status: TransferStatus,
    pub progress: TransferProgress,
    pub start_time: Option<Instant>,
    pub end_time: Option<Instant>,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub error: Option<String>,
    pub checksum: Option<String>,
    #[allow(dead_code)]
    pub cancellation_flag: Arc<AtomicBool>,
}

impl TransferSession {
    pub fn new(id: String, config: TransferConfig) -> Self {
        let progress = TransferProgress::new(id.clone());
        Self {
            id: id.clone(),
            config,
            file_path: None,
            target_address: None,
            status: TransferStatus::Idle,
            progress,
            start_time: None,
            end_time: None,
            bytes_transferred: 0,
            total_bytes: 0,
            error: None,
            checksum: None,
            cancellation_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn with_file_path(mut self, file_path: PathBuf) -> Self {
        self.file_path = Some(file_path);
        self
    }

    pub fn with_target_address(mut self, address: String) -> Self {
        self.target_address = Some(address);
        self
    }

    pub fn with_total_bytes(mut self, total_bytes: u64) -> Self {
        self.total_bytes = total_bytes;
        self.progress.total_bytes = total_bytes;
        self
    }

    pub fn start(&mut self, file_path: Option<PathBuf>, target_address: Option<String>, total_bytes: u64) {
        self.file_path = file_path;
        self.target_address = target_address;
        self.total_bytes = total_bytes;
        self.start_time = Some(Instant::now());
        self.status = TransferStatus::Connecting;
        self.progress.status = TransferStatus::Connecting;
    }

    pub fn complete(&mut self, checksum: String) {
        self.end_time = Some(Instant::now());
        self.status = TransferStatus::Completed;
        self.progress.status = TransferStatus::Completed;
        self.progress.progress = 1.0;
        self.checksum = Some(checksum);
    }

    pub fn fail(&mut self, error: String) {
        self.end_time = Some(Instant::now());
        self.status = TransferStatus::Error;
        self.progress.set_error(error.clone());
        self.error = Some(error);
    }

    pub fn cancel(&mut self) {
        self.cancellation_flag.store(true, Ordering::SeqCst);
        self.end_time = Some(Instant::now());
        self.status = TransferStatus::Cancelled;
    }

    pub fn is_active(&self) -> bool {
        self.status.is_active()
    }

    pub fn is_terminal(&self) -> bool {
        self.status.is_terminal()
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancellation_flag.load(Ordering::SeqCst)
    }

    pub fn update_progress(&mut self, bytes_transferred: u64, speed: f64, eta: u64) {
        self.bytes_transferred = bytes_transferred;
        self.progress.bytes_transferred = bytes_transferred;
        self.progress.speed = speed;
        self.progress.eta = eta;
        
        if self.total_bytes > 0 {
            self.progress.progress = bytes_transferred as f64 / self.total_bytes as f64;
        }
        
        if bytes_transferred > 0 && self.status == TransferStatus::Connecting {
            self.status = TransferStatus::Transferring;
        }
    }

    pub fn duration(&self) -> Option<std::time::Duration> {
        match (self.start_time, self.end_time) {
            (Some(start), Some(end)) => Some(end.duration_since(start)),
            (Some(start), None) => Some(start.elapsed()),
            _ => None,
        }
    }
}

