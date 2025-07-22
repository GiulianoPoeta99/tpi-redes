// Network error helpers
use crate::errors::TransferError;
use std::time::Duration;
use tracing::debug;

pub struct NetworkErrorHelper;

impl NetworkErrorHelper {
    /// Convert std::io::Error to TransferError with network context
    pub fn from_io_error(error: std::io::Error, address: &str, operation: &str) -> TransferError {
        match error.kind() {
            std::io::ErrorKind::ConnectionRefused => {
                TransferError::ConnectionRefused {
                    address: address.to_string(),
                    recoverable: true,
                }
            }
            std::io::ErrorKind::TimedOut => {
                TransferError::Timeout {
                    seconds: 30, // Default timeout
                    operation: operation.to_string(),
                    recoverable: true,
                }
            }
            std::io::ErrorKind::PermissionDenied => {
                TransferError::PermissionDenied {
                    operation: format!("network {}", operation),
                    path: Some(address.to_string()),
                }
            }
            _ => {
                TransferError::NetworkError {
                    message: error.to_string(),
                    context: Some(format!("{:?}", error.kind())),
                    recoverable: true,
                }
            }
        }
    }

    /// Check if an address is reachable (simplified implementation)
    pub async fn check_connectivity(address: &str, _timeout: Duration) -> Result<(), TransferError> {
        // This is a simplified connectivity check
        // In a real implementation, you might use ping or attempt a connection
        debug!("Checking connectivity to {}", address);
        
        // For now, just validate the address format
        if address.is_empty() {
            return Err(TransferError::ConfigError {
                message: "Address cannot be empty".to_string(),
                field: Some("address".to_string()),
            });
        }

        // Basic format validation
        if !address.contains(':') {
            return Err(TransferError::ConfigError {
                message: "Address must include port (e.g., 192.168.1.1:8080)".to_string(),
                field: Some("address".to_string()),
            });
        }

        Ok(())
    }

    /// Create a network error with context
    pub fn create_network_error(
        message: impl Into<String>,
        context: Option<String>,
        recoverable: bool,
    ) -> TransferError {
        TransferError::NetworkError {
            message: message.into(),
            context,
            recoverable,
        }
    }

    /// Create a connection refused error
    pub fn create_connection_refused_error(address: impl Into<String>) -> TransferError {
        TransferError::ConnectionRefused {
            address: address.into(),
            recoverable: true,
        }
    }
}