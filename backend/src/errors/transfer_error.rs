// Transfer error enumeration
use thiserror::Error;
use std::time::Duration;

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