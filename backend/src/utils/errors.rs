// Error handling utilities
use thiserror::Error;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, warn, debug};

#[derive(Error, Debug, Clone)]
pub enum TransferError {
    #[error("Network error: {message}")]
    NetworkError { 
        message: String,
        context: Option<String>,
        recoverable: bool,
    },
    
    #[error("File error: {message}")]
    FileError { 
        message: String,
        file_path: Option<String>,
        recoverable: bool,
    },
    
    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { 
        expected: String, 
        actual: String,
        file_path: String,
    },
    
    #[error("Timeout after {seconds}s")]
    Timeout { 
        seconds: u64,
        operation: String,
        recoverable: bool,
    },
    
    #[error("Protocol error: {message}")]
    ProtocolError { 
        message: String,
        protocol: String,
        recoverable: bool,
    },
    
    #[error("Configuration error: {message}")]
    ConfigError { 
        message: String,
        field: Option<String>,
    },
    
    #[error("Transfer cancelled by user")]
    Cancelled { transfer_id: String },
    
    #[error("Connection refused: {address}")]
    ConnectionRefused { 
        address: String,
        recoverable: bool,
    },
    
    #[error("Permission denied: {operation}")]
    PermissionDenied { 
        operation: String,
        path: Option<String>,
    },
    
    #[error("Insufficient disk space: need {needed} bytes, have {available} bytes")]
    InsufficientSpace { 
        needed: u64,
        available: u64,
        path: String,
    },
    
    #[error("File not found: {path}")]
    FileNotFound { path: String },
    
    #[error("Invalid file format or corrupted data")]
    CorruptedData { 
        details: String,
        recoverable: bool,
    },
    
    #[error("Rate limit exceeded: {message}")]
    RateLimitExceeded { 
        message: String,
        retry_after: Option<Duration>,
    },
    
    #[error("Unknown error: {message}")]
    Unknown { 
        message: String,
        context: Option<String>,
    },
}

impl From<std::io::Error> for TransferError {
    fn from(error: std::io::Error) -> Self {
        let recoverable = match error.kind() {
            std::io::ErrorKind::ConnectionRefused => true,
            std::io::ErrorKind::TimedOut => true,
            std::io::ErrorKind::Interrupted => true,
            std::io::ErrorKind::WouldBlock => true,
            std::io::ErrorKind::UnexpectedEof => false,
            std::io::ErrorKind::PermissionDenied => false,
            std::io::ErrorKind::NotFound => false,
            _ => true,
        };

        match error.kind() {
            std::io::ErrorKind::ConnectionRefused => {
                TransferError::ConnectionRefused {
                    address: "unknown".to_string(),
                    recoverable: true,
                }
            },
            std::io::ErrorKind::PermissionDenied => {
                TransferError::PermissionDenied {
                    operation: "file access".to_string(),
                    path: None,
                }
            },
            std::io::ErrorKind::NotFound => {
                TransferError::FileNotFound {
                    path: "unknown".to_string(),
                }
            },
            _ => TransferError::NetworkError {
                message: error.to_string(),
                context: Some(format!("{:?}", error.kind())),
                recoverable,
            }
        }
    }
}

impl serde::Serialize for TransferError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("TransferError", 4)?;
        state.serialize_field("message", &self.to_string())?;
        state.serialize_field("code", &self.error_code())?;
        state.serialize_field("recoverable", &self.is_recoverable())?;
        state.serialize_field("context", &self.get_context())?;
        state.end()
    }
}

impl TransferError {
    pub fn error_code(&self) -> &'static str {
        match self {
            TransferError::NetworkError { .. } => "NETWORK_ERROR",
            TransferError::FileError { .. } => "FILE_ERROR",
            TransferError::ChecksumMismatch { .. } => "CHECKSUM_MISMATCH",
            TransferError::Timeout { .. } => "TIMEOUT",
            TransferError::ProtocolError { .. } => "PROTOCOL_ERROR",
            TransferError::ConfigError { .. } => "CONFIG_ERROR",
            TransferError::Cancelled { .. } => "CANCELLED",
            TransferError::ConnectionRefused { .. } => "CONNECTION_REFUSED",
            TransferError::PermissionDenied { .. } => "PERMISSION_DENIED",
            TransferError::InsufficientSpace { .. } => "INSUFFICIENT_SPACE",
            TransferError::FileNotFound { .. } => "FILE_NOT_FOUND",
            TransferError::CorruptedData { .. } => "CORRUPTED_DATA",
            TransferError::RateLimitExceeded { .. } => "RATE_LIMIT_EXCEEDED",
            TransferError::Unknown { .. } => "UNKNOWN_ERROR",
        }
    }

    pub fn is_recoverable(&self) -> bool {
        match self {
            TransferError::NetworkError { recoverable, .. } => *recoverable,
            TransferError::FileError { recoverable, .. } => *recoverable,
            TransferError::ChecksumMismatch { .. } => true, // Can retry transfer
            TransferError::Timeout { recoverable, .. } => *recoverable,
            TransferError::ProtocolError { recoverable, .. } => *recoverable,
            TransferError::ConfigError { .. } => false,
            TransferError::Cancelled { .. } => false,
            TransferError::ConnectionRefused { recoverable, .. } => *recoverable,
            TransferError::PermissionDenied { .. } => false,
            TransferError::InsufficientSpace { .. } => false,
            TransferError::FileNotFound { .. } => false,
            TransferError::CorruptedData { recoverable, .. } => *recoverable,
            TransferError::RateLimitExceeded { .. } => true,
            TransferError::Unknown { .. } => false,
        }
    }

    pub fn get_context(&self) -> Option<String> {
        match self {
            TransferError::NetworkError { context, .. } => context.clone(),
            TransferError::FileError { file_path, .. } => file_path.clone(),
            TransferError::ChecksumMismatch { file_path, .. } => Some(file_path.clone()),
            TransferError::Timeout { operation, .. } => Some(operation.clone()),
            TransferError::ProtocolError { protocol, .. } => Some(protocol.clone()),
            TransferError::ConfigError { field, .. } => field.clone(),
            TransferError::Cancelled { transfer_id } => Some(transfer_id.clone()),
            TransferError::ConnectionRefused { address, .. } => Some(address.clone()),
            TransferError::PermissionDenied { path, .. } => path.clone(),
            TransferError::InsufficientSpace { path, .. } => Some(path.clone()),
            TransferError::FileNotFound { path } => Some(path.clone()),
            TransferError::CorruptedData { details, .. } => Some(details.clone()),
            TransferError::RateLimitExceeded { retry_after, .. } => {
                retry_after.map(|d| format!("retry_after_{}s", d.as_secs()))
            },
            TransferError::Unknown { context, .. } => context.clone(),
        }
    }

    pub fn with_context(mut self, context: String) -> Self {
        match &mut self {
            TransferError::NetworkError { context: ctx, .. } => *ctx = Some(context),
            TransferError::FileError { file_path, .. } => *file_path = Some(context),
            TransferError::ConfigError { field, .. } => *field = Some(context),
            TransferError::PermissionDenied { path, .. } => *path = Some(context),
            TransferError::Unknown { context: ctx, .. } => *ctx = Some(context),
            _ => {}
        }
        self
    }
}

/// Retry configuration for error recovery
#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_attempts: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
    pub backoff_multiplier: f64,
    pub jitter: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 2.0,
            jitter: true,
        }
    }
}

impl RetryConfig {
    pub fn new(max_attempts: u32) -> Self {
        Self {
            max_attempts,
            ..Default::default()
        }
    }

    pub fn with_delays(mut self, initial: Duration, max: Duration) -> Self {
        self.initial_delay = initial;
        self.max_delay = max;
        self
    }

    pub fn with_backoff(mut self, multiplier: f64) -> Self {
        self.backoff_multiplier = multiplier;
        self
    }

    pub fn with_jitter(mut self, jitter: bool) -> Self {
        self.jitter = jitter;
        self
    }
}

/// Exponential backoff retry utility
#[derive(Clone)]
pub struct RetryHandler {
    config: RetryConfig,
}

impl RetryHandler {
    pub fn new(config: RetryConfig) -> Self {
        Self { config }
    }

    pub async fn retry_with_backoff<F, Fut, T>(&self, operation: F) -> Result<T, TransferError>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, TransferError>>,
    {
        let mut attempt = 0;
        let mut delay = self.config.initial_delay;

        loop {
            attempt += 1;
            
            match operation().await {
                Ok(result) => {
                    if attempt > 1 {
                        debug!("Operation succeeded after {} attempts", attempt);
                    }
                    return Ok(result);
                }
                Err(error) => {
                    if attempt >= self.config.max_attempts || !error.is_recoverable() {
                        error!("Operation failed after {} attempts: {}", attempt, error);
                        return Err(error);
                    }

                    warn!("Operation failed (attempt {}/{}): {}. Retrying in {:?}", 
                          attempt, self.config.max_attempts, error, delay);

                    sleep(delay).await;

                    // Calculate next delay with exponential backoff
                    delay = Duration::from_millis(
                        (delay.as_millis() as f64 * self.config.backoff_multiplier) as u64
                    );
                    
                    if delay > self.config.max_delay {
                        delay = self.config.max_delay;
                    }

                    // Add jitter to prevent thundering herd
                    if self.config.jitter {
                        let jitter_ms = (delay.as_millis() as f64 * 0.1 * rand::random::<f64>()) as u64;
                        delay = Duration::from_millis(delay.as_millis() as u64 + jitter_ms);
                    }
                }
            }
        }
    }
}

/// Error recovery strategies
pub struct ErrorRecovery;

impl ErrorRecovery {
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