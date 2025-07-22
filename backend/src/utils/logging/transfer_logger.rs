// Structured logging for transfer events
use crate::errors::TransferError;
use tracing::{debug, error, info, warn};

pub struct TransferLogger;

impl TransferLogger {
    /// Log transfer initiation
    pub fn log_transfer_start(transfer_id: &str, filename: &str, target: &str, protocol: &str, mode: &str) {
        info!(
            transfer_id = transfer_id,
            filename = filename,
            target = target,
            protocol = protocol,
            mode = mode,
            "Transfer started"
        );
    }

    /// Log transfer progress with structured data
    pub fn log_transfer_progress(
        transfer_id: &str, 
        progress: f64, 
        speed: f64, 
        bytes_transferred: u64,
        total_bytes: u64,
        eta_seconds: u64
    ) {
        debug!(
            transfer_id = transfer_id,
            progress_percent = progress * 100.0,
            speed_mbps = speed / 1_000_000.0,
            bytes_transferred = bytes_transferred,
            total_bytes = total_bytes,
            eta_seconds = eta_seconds,
            "Transfer progress update"
        );
    }

    /// Log successful transfer completion
    pub fn log_transfer_complete(
        transfer_id: &str, 
        bytes_transferred: u64, 
        duration_ms: u64,
        checksum: &str,
        protocol: &str
    ) {
        info!(
            transfer_id = transfer_id,
            bytes_transferred = bytes_transferred,
            duration_ms = duration_ms,
            throughput_mbps = (bytes_transferred as f64 / (duration_ms as f64 / 1000.0)) / 1_000_000.0,
            checksum = checksum,
            protocol = protocol,
            "Transfer completed successfully"
        );
    }

    /// Log transfer error with context
    pub fn log_transfer_error(transfer_id: &str, error: &TransferError) {
        error!(
            transfer_id = transfer_id,
            error_code = error.error_code(),
            error_message = %error,
            recoverable = error.is_recoverable(),
            context = ?error.get_context(),
            "Transfer failed"
        );
    }

    /// Log transfer cancellation
    pub fn log_transfer_cancelled(transfer_id: &str, reason: &str) {
        warn!(
            transfer_id = transfer_id,
            reason = reason,
            "Transfer cancelled"
        );
    }

    /// Log connection events
    pub fn log_connection_event(event: &str, address: &str, protocol: &str, success: bool) {
        if success {
            info!(
                event = event,
                address = address,
                protocol = protocol,
                "Connection event"
            );
        } else {
            warn!(
                event = event,
                address = address,
                protocol = protocol,
                "Connection event failed"
            );
        }
    }

    /// Log file operations
    pub fn log_file_operation(operation: &str, path: &str, size: Option<u64>, success: bool) {
        if success {
            debug!(
                operation = operation,
                path = path,
                size_bytes = size,
                "File operation completed"
            );
        } else {
            error!(
                operation = operation,
                path = path,
                size_bytes = size,
                "File operation failed"
            );
        }
    }

    /// Log checksum verification
    pub fn log_checksum_verification(
        transfer_id: &str,
        expected: &str,
        actual: &str,
        file_path: &str,
        success: bool
    ) {
        if success {
            debug!(
                transfer_id = transfer_id,
                checksum = expected,
                file_path = file_path,
                "Checksum verification passed"
            );
        } else {
            error!(
                transfer_id = transfer_id,
                expected_checksum = expected,
                actual_checksum = actual,
                file_path = file_path,
                "Checksum verification failed"
            );
        }
    }

    /// Log retry attempts
    pub fn log_retry_attempt(
        operation: &str,
        attempt: u32,
        max_attempts: u32,
        delay_ms: u64,
        error: &TransferError
    ) {
        warn!(
            operation = operation,
            attempt = attempt,
            max_attempts = max_attempts,
            delay_ms = delay_ms,
            error_code = error.error_code(),
            error_message = %error,
            "Retrying operation after failure"
        );
    }

    /// Log performance metrics
    pub fn log_performance_metrics(
        transfer_id: &str,
        total_bytes: u64,
        duration_ms: u64,
        chunk_count: u32,
        retransmissions: u32,
        protocol: &str
    ) {
        info!(
            transfer_id = transfer_id,
            total_bytes = total_bytes,
            duration_ms = duration_ms,
            throughput_mbps = (total_bytes as f64 / (duration_ms as f64 / 1000.0)) / 1_000_000.0,
            chunk_count = chunk_count,
            retransmissions = retransmissions,
            protocol = protocol,
            efficiency_percent = ((chunk_count - retransmissions) as f64 / chunk_count as f64) * 100.0,
            "Transfer performance metrics"
        );
    }
}