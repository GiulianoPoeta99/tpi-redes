// Error recovery strategies
use crate::errors::TransferError;

pub struct ErrorRecoveryStrategies;

impl ErrorRecoveryStrategies {
    /// Get suggested recovery action for an error
    pub fn get_recovery_suggestion(error: &TransferError) -> Option<String> {
        match error {
            TransferError::NetworkError { .. } => {
                Some("Check network connection and try again".to_string())
            }
            TransferError::ConnectionRefused { address, .. } => {
                Some(format!("Ensure the target {} is reachable and accepting connections", address))
            }
            TransferError::FileNotFound { path } => {
                Some(format!("Verify that the file '{}' exists and is accessible", path))
            }
            TransferError::PermissionDenied { operation, path } => {
                let path_info = path.as_ref().map(|p| format!(" for '{}'", p)).unwrap_or_default();
                Some(format!("Check permissions for {}{}", operation, path_info))
            }
            TransferError::InsufficientSpace { needed, available, .. } => {
                Some(format!("Free up {} bytes of disk space (need {}, have {})", 
                           needed - available, needed, available))
            }
            TransferError::ChecksumMismatch { .. } => {
                Some("File may be corrupted. Try transferring again".to_string())
            }
            TransferError::Timeout { .. } => {
                Some("Operation timed out. Check network conditions and try again".to_string())
            }
            TransferError::RateLimitExceeded { retry_after, .. } => {
                if let Some(delay) = retry_after {
                    Some(format!("Rate limit exceeded. Wait {} seconds before retrying", delay.as_secs()))
                } else {
                    Some("Rate limit exceeded. Wait before retrying".to_string())
                }
            }
            _ => None,
        }
    }

    /// Check if an error should trigger an automatic retry
    pub fn should_auto_retry(error: &TransferError, attempt: u32, max_attempts: u32) -> bool {
        if attempt >= max_attempts {
            return false;
        }

        match error {
            TransferError::NetworkError { recoverable, .. } => *recoverable,
            TransferError::ConnectionRefused { recoverable, .. } => *recoverable,
            TransferError::Timeout { recoverable, .. } => *recoverable,
            TransferError::CorruptedData { recoverable, .. } => *recoverable,
            TransferError::RateLimitExceeded { .. } => true,
            _ => false,
        }
    }
}