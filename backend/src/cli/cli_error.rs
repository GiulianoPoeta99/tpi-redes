// CLI-specific error types
use crate::errors::TransferError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CliError {
    #[error("Transfer operation failed: {0}")]
    Transfer(#[from] TransferError),
    
    #[error("File system error: {message}")]
    FileSystem { 
        message: String,
        path: Option<String>,
    },
    
    #[error("Invalid command argument: {argument} - {reason}")]
    InvalidArgument { 
        argument: String,
        reason: String,
    },
    
    #[error("Configuration error: {message}")]
    Configuration { message: String },
    
    #[error("Application initialization failed: {message}")]
    Initialization { message: String },
    
    #[error("IO operation failed: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Application runtime error: {message}")]
    Runtime { message: String },
}

impl CliError {
    pub fn exit_code(&self) -> i32 {
        match self {
            CliError::Transfer(_) => 1,
            CliError::FileSystem { .. } => 2,
            CliError::InvalidArgument { .. } => 3,
            CliError::Configuration { .. } => 4,
            CliError::Initialization { .. } => 5,
            CliError::Io(_) => 6,
            CliError::Json(_) => 7,
            CliError::Runtime { .. } => 8,
        }
    }
    
    pub fn file_system(message: impl Into<String>, path: Option<String>) -> Self {
        Self::FileSystem {
            message: message.into(),
            path,
        }
    }
    
    pub fn invalid_argument(argument: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::InvalidArgument {
            argument: argument.into(),
            reason: reason.into(),
        }
    }
    
    pub fn configuration(message: impl Into<String>) -> Self {
        Self::Configuration {
            message: message.into(),
        }
    }
    
    pub fn initialization(message: impl Into<String>) -> Self {
        Self::Initialization {
            message: message.into(),
        }
    }
    
    pub fn runtime(message: impl Into<String>) -> Self {
        Self::Runtime {
            message: message.into(),
        }
    }
}