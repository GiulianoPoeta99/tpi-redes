// Error recovery strategies
use crate::errors::TransferError;
use std::time::Duration;

pub struct ErrorRecoveryStrategies;

impl ErrorRecoveryStrategies {
    /// Get suggested recovery action for an error
    pub fn get_recovery_suggestion(error: &TransferError) -> Option<String> {
        match error {
            TransferError::NetworkError { context, .. } => {
                if let Some(ctx) = context {
                    if ctx.contains("Connection reset") {
                        Some("Connection was reset by the remote host. Check network stability and try again".to_string())
                    } else if ctx.contains("No route to host") {
                        Some("Cannot reach the target host. Check network connectivity and routing".to_string())
                    } else if ctx.contains("Network unreachable") {
                        Some("Network is unreachable. Check your network connection".to_string())
                    } else {
                        Some("Network error occurred. Check your connection and try again".to_string())
                    }
                } else {
                    Some("Check network connection and try again".to_string())
                }
            }
            TransferError::ConnectionRefused { address, .. } => {
                Some(format!("Connection refused by {}. Ensure the target is running and accepting connections on the specified port", address))
            }
            TransferError::FileNotFound { path } => {
                Some(format!("File '{}' not found. Verify the file exists and you have read permissions", path))
            }
            TransferError::PermissionDenied { operation, path } => {
                let path_info = path.as_ref().map(|p| format!(" for '{}'", p)).unwrap_or_default();
                Some(format!("Permission denied for {}{}", operation, path_info))
            }
            TransferError::InsufficientSpace { needed, available, path } => {
                let needed_mb = needed / (1024 * 1024);
                let available_mb = available / (1024 * 1024);
                Some(format!("Insufficient disk space in '{}'. Need {} MB, have {} MB. Free up {} MB and try again", 
                           path, needed_mb, available_mb, needed_mb - available_mb))
            }
            TransferError::ChecksumMismatch { expected, actual, file_path } => {
                Some(format!("File '{}' integrity check failed (expected: {}, got: {}). The file may be corrupted during transfer. Try again", 
                           file_path, &expected[..8], &actual[..8]))
            }
            TransferError::Timeout { operation, seconds, .. } => {
                match operation.as_str() {
                    op if op.contains("connect") => {
                        Some(format!("Connection timeout after {}s. The target may be unreachable or overloaded", seconds))
                    }
                    op if op.contains("read") => {
                        Some(format!("Read timeout after {}s. Network may be slow or unstable", seconds))
                    }
                    op if op.contains("write") => {
                        Some(format!("Write timeout after {}s. Target may be overloaded or network is slow", seconds))
                    }
                    _ => {
                        Some(format!("Operation '{}' timed out after {}s. Check network conditions and try again", operation, seconds))
                    }
                }
            }
            TransferError::RateLimitExceeded { retry_after, .. } => {
                if let Some(delay) = retry_after {
                    Some(format!("Rate limit exceeded. Wait {} seconds before retrying", delay.as_secs()))
                } else {
                    Some("Rate limit exceeded. Wait a moment before retrying".to_string())
                }
            }
            TransferError::CorruptedData { details, .. } => {
                Some(format!("Data corruption detected: {}. Try transferring the file again", details))
            }
            TransferError::Cancelled { .. } => {
                Some("Transfer was cancelled by user".to_string())
            }
            TransferError::ProtocolError { message, protocol, .. } => {
                Some(format!("{} protocol error: {}. Check configuration and try again", protocol, message))
            }
            TransferError::ConfigError { message, field } => {
                if let Some(field_name) = field {
                    Some(format!("Configuration error in '{}': {}", field_name, message))
                } else {
                    Some(format!("Configuration error: {}", message))
                }
            }
            TransferError::FileError { message, file_path, .. } => {
                if let Some(path) = file_path {
                    Some(format!("File operation failed for '{}': {}", path, message))
                } else {
                    Some(format!("File operation failed: {}", message))
                }
            }
            TransferError::Unknown { message, context } => {
                if let Some(ctx) = context {
                    Some(format!("Unknown error: {} (context: {})", message, ctx))
                } else {
                    Some(format!("Unknown error: {}", message))
                }
            }
        }
    }

    /// Check if an error should trigger an automatic retry
    pub fn should_auto_retry(error: &TransferError, attempt: u32, max_attempts: u32) -> bool {
        if attempt >= max_attempts {
            return false;
        }

        match error {
            TransferError::NetworkError { recoverable, .. } => *recoverable,
            TransferError::ConnectionRefused { recoverable, .. } => *recoverable && attempt <= 2, // Limit connection retries
            TransferError::Timeout { recoverable, .. } => *recoverable,
            TransferError::CorruptedData { recoverable, .. } => *recoverable && attempt <= 1, // Only retry once for corruption
            TransferError::ChecksumMismatch { .. } => attempt <= 1, // Only retry once for checksum mismatch
            TransferError::RateLimitExceeded { .. } => true,
            TransferError::ProtocolError { recoverable, .. } => *recoverable && attempt <= 1,
            TransferError::FileError { recoverable, .. } => *recoverable && attempt <= 2,
            _ => false,
        }
    }

    /// Get the appropriate retry delay for an error
    pub fn get_retry_delay(error: &TransferError, attempt: u32, base_delay: Duration) -> Duration {
        let multiplier = match error {
            TransferError::RateLimitExceeded { retry_after, .. } => {
                return retry_after.unwrap_or(Duration::from_secs(5));
            }
            TransferError::NetworkError { .. } => 2.0_f64.powi(attempt as i32), // Exponential backoff
            TransferError::ConnectionRefused { .. } => 1.5_f64.powi(attempt as i32), // Slower backoff
            TransferError::Timeout { .. } => 2.0_f64.powi(attempt as i32),
            TransferError::FileError { .. } => 1.5_f64.powi(attempt as i32), // Moderate backoff for file errors
            _ => 1.0,
        };

        let delay_ms = (base_delay.as_millis() as f64 * multiplier) as u64;
        let max_delay = Duration::from_secs(30);
        
        Duration::from_millis(delay_ms).min(max_delay)
    }

    /// Detect network error type from system error
    pub fn classify_network_error(error: &std::io::Error) -> (String, bool) {
        match error.kind() {
            std::io::ErrorKind::ConnectionRefused => {
                ("Connection refused by target".to_string(), true)
            }
            std::io::ErrorKind::ConnectionReset => {
                ("Connection reset by peer".to_string(), true)
            }
            std::io::ErrorKind::ConnectionAborted => {
                ("Connection aborted".to_string(), true)
            }
            std::io::ErrorKind::TimedOut => {
                ("Network operation timed out".to_string(), true)
            }
            std::io::ErrorKind::Interrupted => {
                ("Operation was interrupted".to_string(), true)
            }
            std::io::ErrorKind::WouldBlock => {
                ("Operation would block".to_string(), true)
            }
            std::io::ErrorKind::UnexpectedEof => {
                ("Unexpected end of file/stream".to_string(), false)
            }
            std::io::ErrorKind::BrokenPipe => {
                ("Broken pipe".to_string(), false)
            }
            std::io::ErrorKind::AddrInUse => {
                ("Address already in use".to_string(), false)
            }
            std::io::ErrorKind::AddrNotAvailable => {
                ("Address not available".to_string(), false)
            }
            std::io::ErrorKind::NotConnected => {
                ("Socket is not connected".to_string(), true)
            }
            _ => {
                (format!("Network error: {}", error), true)
            }
        }
    }

    /// Get user-friendly error message
    pub fn get_user_friendly_message(error: &TransferError) -> String {
        match error {
            TransferError::NetworkError { .. } => "Network connection problem".to_string(),
            TransferError::FileError { .. } => "File operation failed".to_string(),
            TransferError::ChecksumMismatch { .. } => "File integrity check failed".to_string(),
            TransferError::Timeout { .. } => "Operation timed out".to_string(),
            TransferError::ProtocolError { .. } => "Communication protocol error".to_string(),
            TransferError::ConfigError { .. } => "Configuration error".to_string(),
            TransferError::Cancelled { .. } => "Transfer cancelled".to_string(),
            TransferError::ConnectionRefused { .. } => "Connection refused".to_string(),
            TransferError::PermissionDenied { .. } => "Permission denied".to_string(),
            TransferError::InsufficientSpace { .. } => "Insufficient disk space".to_string(),
            TransferError::FileNotFound { .. } => "File not found".to_string(),
            TransferError::CorruptedData { .. } => "Data corruption detected".to_string(),
            TransferError::RateLimitExceeded { .. } => "Rate limit exceeded".to_string(),
            TransferError::Unknown { .. } => "Unknown error occurred".to_string(),
        }
    }
}