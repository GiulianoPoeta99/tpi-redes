// Logging utilities
use tracing::{info, warn, error, debug};

pub fn init_logging(verbose: bool) {
    let level = if verbose {
        tracing::Level::DEBUG
    } else {
        tracing::Level::INFO
    };
    
    tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
}

pub fn log_transfer_start(transfer_id: &str, filename: &str, target: &str) {
    info!("Starting transfer {} for file '{}' to target '{}'", transfer_id, filename, target);
}

pub fn log_transfer_progress(transfer_id: &str, progress: f64, speed: f64) {
    debug!("Transfer {} progress: {:.1}% at {:.2} MB/s", transfer_id, progress * 100.0, speed / 1_000_000.0);
}

pub fn log_transfer_complete(transfer_id: &str, bytes_transferred: u64, duration_ms: u64) {
    info!("Transfer {} completed: {} bytes in {}ms", transfer_id, bytes_transferred, duration_ms);
}

pub fn log_transfer_error(transfer_id: &str, error: &str) {
    error!("Transfer {} failed: {}", transfer_id, error);
}