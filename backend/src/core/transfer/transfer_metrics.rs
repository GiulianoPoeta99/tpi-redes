// Transfer metrics for performance tracking
use crate::config::Protocol;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct TransferMetrics {
    pub transfer_id: String,
    pub protocol: Protocol,
    pub start_time: Instant,
    pub end_time: Option<Instant>,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub peak_speed: f64,
    pub average_speed: f64,
    pub error_count: u32,
    pub retry_count: u32,
}

impl TransferMetrics {
    pub fn duration(&self) -> Duration {
        match self.end_time {
            Some(end) => end.duration_since(self.start_time),
            None => self.start_time.elapsed(),
        }
    }

    pub fn is_complete(&self) -> bool {
        self.end_time.is_some()
    }

    pub fn success_rate(&self) -> f64 {
        let total_attempts = 1 + self.retry_count;
        if total_attempts == 0 {
            1.0
        } else {
            1.0 - (self.error_count as f64 / total_attempts as f64)
        }
    }

    pub fn efficiency(&self) -> f64 {
        if self.total_bytes == 0 {
            0.0
        } else {
            self.bytes_transferred as f64 / self.total_bytes as f64
        }
    }
}