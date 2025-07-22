// Timeout utilities
use crate::errors::TransferError;
use std::time::Duration;

pub struct TimeoutHelper;

impl TimeoutHelper {
    /// Create a timeout error with context
    pub fn timeout_error(operation: &str, seconds: u64) -> TransferError {
        TransferError::Timeout {
            seconds,
            operation: operation.to_string(),
            recoverable: true,
        }
    }

    /// Wrap an async operation with timeout
    pub async fn with_timeout<F, T>(
        future: F,
        timeout: Duration,
        operation: &str,
    ) -> Result<T, TransferError>
    where
        F: std::future::Future<Output = Result<T, TransferError>>,
    {
        match tokio::time::timeout(timeout, future).await {
            Ok(result) => result,
            Err(_) => Err(Self::timeout_error(operation, timeout.as_secs())),
        }
    }

    /// Create a timeout with default duration for common operations
    pub fn default_timeout_for(operation: &str) -> Duration {
        match operation {
            "connect" => Duration::from_secs(30),
            "handshake" => Duration::from_secs(10),
            "file_transfer" => Duration::from_secs(300),
            "chunk_transfer" => Duration::from_secs(5),
            _ => Duration::from_secs(60),
        }
    }

    /// Check if an error is timeout-related and recoverable
    pub fn is_timeout_recoverable(error: &TransferError) -> bool {
        match error {
            TransferError::Timeout { recoverable, .. } => *recoverable,
            TransferError::NetworkError { recoverable, .. } => *recoverable,
            _ => false,
        }
    }
}