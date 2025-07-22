// Metrics collector for transfer statistics
use crate::config::Protocol;
use crate::core::transfer::TransferMetrics;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

pub struct MetricsCollector {
    transfer_metrics: Arc<Mutex<HashMap<String, TransferMetrics>>>,
}



impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            transfer_metrics: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start_transfer(&self, transfer_id: String, protocol: Protocol, total_bytes: u64) {
        let metrics = TransferMetrics {
            transfer_id: transfer_id.clone(),
            protocol,
            start_time: Instant::now(),
            end_time: None,
            bytes_transferred: 0,
            total_bytes,
            peak_speed: 0.0,
            average_speed: 0.0,
            error_count: 0,
            retry_count: 0,
        };

        if let Ok(mut map) = self.transfer_metrics.lock() {
            map.insert(transfer_id, metrics);
        }
    }

    pub fn update_progress(&self, transfer_id: &str, bytes_transferred: u64, current_speed: f64) {
        if let Ok(mut map) = self.transfer_metrics.lock() {
            if let Some(metrics) = map.get_mut(transfer_id) {
                metrics.bytes_transferred = bytes_transferred;
                
                if current_speed > metrics.peak_speed {
                    metrics.peak_speed = current_speed;
                }

                // Calculate average speed
                let elapsed = metrics.start_time.elapsed().as_secs_f64();
                if elapsed > 0.0 {
                    metrics.average_speed = bytes_transferred as f64 / elapsed;
                }
            }
        }
    }

    pub fn record_error(&self, transfer_id: &str) {
        if let Ok(mut map) = self.transfer_metrics.lock() {
            if let Some(metrics) = map.get_mut(transfer_id) {
                metrics.error_count += 1;
            }
        }
    }

    pub fn record_retry(&self, transfer_id: &str) {
        if let Ok(mut map) = self.transfer_metrics.lock() {
            if let Some(metrics) = map.get_mut(transfer_id) {
                metrics.retry_count += 1;
            }
        }
    }

    pub fn complete_transfer(&self, transfer_id: &str) {
        if let Ok(mut map) = self.transfer_metrics.lock() {
            if let Some(metrics) = map.get_mut(transfer_id) {
                metrics.end_time = Some(Instant::now());
            }
        }
    }

    pub fn get_metrics(&self, transfer_id: &str) -> Option<TransferMetrics> {
        if let Ok(map) = self.transfer_metrics.lock() {
            map.get(transfer_id).cloned()
        } else {
            None
        }
    }

    pub fn get_all_metrics(&self) -> Vec<TransferMetrics> {
        if let Ok(map) = self.transfer_metrics.lock() {
            map.values().cloned().collect()
        } else {
            Vec::new()
        }
    }

    pub fn remove_transfer(&self, transfer_id: &str) -> Option<TransferMetrics> {
        if let Ok(mut map) = self.transfer_metrics.lock() {
            map.remove(transfer_id)
        } else {
            None
        }
    }

    pub fn clear_completed(&self) {
        if let Ok(mut map) = self.transfer_metrics.lock() {
            map.retain(|_, metrics| metrics.end_time.is_none());
        }
    }

    /// Record a transfer (legacy method for compatibility)
    pub fn record_transfer(&self, transfer_id: String, protocol: Protocol, bytes_transferred: u64, duration: std::time::Duration, success: bool) {
        self.start_transfer(transfer_id.clone(), protocol, bytes_transferred);
        self.update_progress(&transfer_id, bytes_transferred, bytes_transferred as f64 / duration.as_secs_f64());
        if !success {
            self.record_error(&transfer_id);
        }
        self.complete_transfer(&transfer_id);
    }

    /// Update transfer progress (legacy method name)
    pub fn update_transfer_progress(&self, transfer_id: &str, bytes_transferred: u64, current_speed: f64) {
        self.update_progress(transfer_id, bytes_transferred, current_speed);
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

