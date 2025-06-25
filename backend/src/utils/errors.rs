// Error handling utilities
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TransferError {
    #[error("Network error: {0}")]
    NetworkError(#[from] std::io::Error),
    
    #[error("File error: {message}")]
    FileError { message: String },
    
    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },
    
    #[error("Timeout after {seconds}s")]
    Timeout { seconds: u64 },
    
    #[error("Protocol error: {message}")]
    ProtocolError { message: String },
    
    #[error("Configuration error: {message}")]
    ConfigError { message: String },
    
    #[error("Transfer cancelled")]
    Cancelled,
    
    #[error("Unknown error: {message}")]
    Unknown { message: String },
}

impl serde::Serialize for TransferError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("TransferError", 2)?;
        state.serialize_field("message", &self.to_string())?;
        state.serialize_field("code", &self.error_code())?;
        state.end()
    }
}

impl TransferError {
    pub fn error_code(&self) -> &'static str {
        match self {
            TransferError::NetworkError(_) => "NETWORK_ERROR",
            TransferError::FileError { .. } => "FILE_ERROR",
            TransferError::ChecksumMismatch { .. } => "CHECKSUM_MISMATCH",
            TransferError::Timeout { .. } => "TIMEOUT",
            TransferError::ProtocolError { .. } => "PROTOCOL_ERROR",
            TransferError::ConfigError { .. } => "CONFIG_ERROR",
            TransferError::Cancelled => "CANCELLED",
            TransferError::Unknown { .. } => "UNKNOWN_ERROR",
        }
    }
}