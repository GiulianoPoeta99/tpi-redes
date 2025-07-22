// Event builder utilities
use crate::errors::TransferError;
use super::{
    TransferProgressEvent, TransferErrorEvent, TransferCompletedEvent,
    TransferStartedEvent, TransferCancelledEvent, ConnectionEvent
};

pub struct EventBuilder;

impl EventBuilder {
    pub fn progress_event(
        transfer_id: String,
        progress: f64,
        speed: f64,
        eta: u64,
        bytes_transferred: u64,
        total_bytes: u64,
    ) -> TransferProgressEvent {
        TransferProgressEvent {
            transfer_id,
            progress,
            speed,
            eta,
            bytes_transferred,
            total_bytes,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn error_event(transfer_id: String, error: &TransferError) -> TransferErrorEvent {
        use crate::errors::ErrorRecoveryStrategies;
        
        TransferErrorEvent {
            transfer_id,
            error: error.to_string(),
            error_code: error.error_code().to_string(),
            recoverable: error.is_recoverable(),
            context: error.get_context(),
            recovery_suggestion: ErrorRecoveryStrategies::get_recovery_suggestion(error),
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn completed_event(
        transfer_id: String,
        bytes_transferred: u64,
        duration: u64,
        checksum: String,
        protocol: String,
    ) -> TransferCompletedEvent {
        let throughput_mbps = if duration > 0 {
            (bytes_transferred as f64 / (duration as f64 / 1000.0)) / 1_000_000.0
        } else {
            0.0
        };

        TransferCompletedEvent {
            transfer_id,
            bytes_transferred,
            duration,
            checksum,
            protocol,
            throughput_mbps,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn started_event(
        transfer_id: String,
        filename: String,
        file_size: u64,
        target: String,
        protocol: String,
        mode: String,
    ) -> TransferStartedEvent {
        TransferStartedEvent {
            transfer_id,
            filename,
            file_size,
            target,
            protocol,
            mode,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn cancelled_event(
        transfer_id: String,
        reason: String,
        bytes_transferred: u64,
    ) -> TransferCancelledEvent {
        TransferCancelledEvent {
            transfer_id,
            reason,
            bytes_transferred,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }

    pub fn connection_event(
        transfer_id: Option<String>,
        event_type: String,
        address: String,
        protocol: String,
        success: bool,
        error: Option<String>,
    ) -> ConnectionEvent {
        ConnectionEvent {
            transfer_id,
            event_type,
            address,
            protocol,
            success,
            error,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }
}