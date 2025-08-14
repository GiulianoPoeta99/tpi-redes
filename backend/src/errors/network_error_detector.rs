// Network error detection and classification
use crate::errors::TransferError;
use std::io::Error as IoError;
use std::time::Duration;
use tracing::{debug, warn};

pub struct NetworkErrorDetector;

impl NetworkErrorDetector {
    /// Detect and classify network errors from IO errors
    pub fn classify_io_error(error: IoError, context: Option<String>) -> TransferError {
        let (message, recoverable) = match error.kind() {
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
                ("Unexpected end of connection".to_string(), false)
            }
            std::io::ErrorKind::BrokenPipe => {
                ("Connection broken".to_string(), false)
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
            std::io::ErrorKind::PermissionDenied => {
                return TransferError::PermissionDenied {
                    operation: "network access".to_string(),
                    path: context,
                };
            }
            std::io::ErrorKind::NotFound => {
                return TransferError::FileNotFound {
                    path: context.unwrap_or_else(|| "unknown".to_string()),
                };
            }
            _ => {
                (format!("Network error: {}", error), true)
            }
        };

        // Special handling for connection refused
        if matches!(error.kind(), std::io::ErrorKind::ConnectionRefused) {
            return TransferError::ConnectionRefused {
                address: context.unwrap_or_else(|| "unknown".to_string()),
                recoverable,
            };
        }

        TransferError::NetworkError {
            message,
            context,
            recoverable,
        }
    }

    /// Detect network connectivity issues
    pub async fn check_network_connectivity(target: &str, port: u16, timeout: Duration) -> NetworkStatus {
        debug!("Checking network connectivity to {}:{}", target, port);
        
        let addr = match format!("{}:{}", target, port).parse::<std::net::SocketAddr>() {
            Ok(addr) => addr,
            Err(_) => {
                warn!("Invalid address format: {}:{}", target, port);
                return NetworkStatus::InvalidAddress;
            }
        };

        match tokio::time::timeout(timeout, tokio::net::TcpStream::connect(addr)).await {
            Ok(Ok(_)) => {
                debug!("Network connectivity check successful");
                NetworkStatus::Connected
            }
            Ok(Err(e)) => {
                warn!("Network connectivity check failed: {}", e);
                match e.kind() {
                    std::io::ErrorKind::ConnectionRefused => NetworkStatus::ConnectionRefused,
                    std::io::ErrorKind::TimedOut => NetworkStatus::Timeout,
                    std::io::ErrorKind::AddrNotAvailable => NetworkStatus::AddressNotAvailable,
                    _ => NetworkStatus::NetworkError(e.to_string()),
                }
            }
            Err(_) => {
                warn!("Network connectivity check timed out");
                NetworkStatus::Timeout
            }
        }
    }

    /// Analyze error patterns to suggest recovery actions
    pub fn analyze_error_pattern(errors: &[TransferError]) -> ErrorPattern {
        if errors.is_empty() {
            return ErrorPattern::NoPattern;
        }

        let network_errors = errors.iter().filter(|e| matches!(e, TransferError::NetworkError { .. })).count();
        let timeout_errors = errors.iter().filter(|e| matches!(e, TransferError::Timeout { .. })).count();
        let connection_errors = errors.iter().filter(|e| matches!(e, TransferError::ConnectionRefused { .. })).count();
        let checksum_errors = errors.iter().filter(|e| matches!(e, TransferError::ChecksumMismatch { .. })).count();

        let total = errors.len();
        
        if network_errors as f32 / total as f32 > 0.7 {
            ErrorPattern::NetworkInstability
        } else if timeout_errors as f32 / total as f32 > 0.6 {
            ErrorPattern::SlowNetwork
        } else if connection_errors as f32 / total as f32 > 0.5 {
            ErrorPattern::TargetUnavailable
        } else if checksum_errors as f32 / total as f32 > 0.3 {
            ErrorPattern::DataCorruption
        } else {
            ErrorPattern::Mixed
        }
    }

    /// Get recovery recommendations based on error pattern
    pub fn get_pattern_recovery_recommendation(pattern: &ErrorPattern) -> String {
        match pattern {
            ErrorPattern::NetworkInstability => {
                "Network appears unstable. Try using a wired connection or check for interference.".to_string()
            }
            ErrorPattern::SlowNetwork => {
                "Network is slow. Consider increasing timeout values or trying during off-peak hours.".to_string()
            }
            ErrorPattern::TargetUnavailable => {
                "Target appears to be unavailable. Verify the target is running and accessible.".to_string()
            }
            ErrorPattern::DataCorruption => {
                "Data corruption detected. Check network quality and consider using TCP protocol.".to_string()
            }
            ErrorPattern::Mixed => {
                "Multiple error types detected. Check both network and system configuration.".to_string()
            }
            ErrorPattern::NoPattern => {
                "No clear error pattern detected.".to_string()
            }
        }
    }
}

#[derive(Debug, Clone)]
pub enum NetworkStatus {
    Connected,
    ConnectionRefused,
    Timeout,
    AddressNotAvailable,
    InvalidAddress,
    NetworkError(String),
}

#[derive(Debug, Clone)]
pub enum ErrorPattern {
    NetworkInstability,
    SlowNetwork,
    TargetUnavailable,
    DataCorruption,
    Mixed,
    NoPattern,
}

impl NetworkStatus {
    pub fn is_recoverable(&self) -> bool {
        matches!(self, 
            NetworkStatus::ConnectionRefused | 
            NetworkStatus::Timeout | 
            NetworkStatus::NetworkError(_)
        )
    }

    pub fn to_transfer_error(&self, context: String) -> TransferError {
        match self {
            NetworkStatus::Connected => {
                TransferError::Unknown {
                    message: "Unexpected success in error context".to_string(),
                    context: Some(context),
                }
            }
            NetworkStatus::ConnectionRefused => {
                TransferError::ConnectionRefused {
                    address: context,
                    recoverable: true,
                }
            }
            NetworkStatus::Timeout => {
                TransferError::Timeout {
                    seconds: 30, // Default timeout
                    operation: "network connectivity check".to_string(),
                    recoverable: true,
                }
            }
            NetworkStatus::AddressNotAvailable => {
                TransferError::NetworkError {
                    message: "Address not available".to_string(),
                    context: Some(context),
                    recoverable: false,
                }
            }
            NetworkStatus::InvalidAddress => {
                TransferError::ConfigError {
                    message: "Invalid network address format".to_string(),
                    field: Some("target_address".to_string()),
                }
            }
            NetworkStatus::NetworkError(msg) => {
                TransferError::NetworkError {
                    message: msg.clone(),
                    context: Some(context),
                    recoverable: true,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Error, ErrorKind};

    #[test]
    fn test_classify_connection_refused() {
        let io_error = Error::new(ErrorKind::ConnectionRefused, "Connection refused");
        let result = NetworkErrorDetector::classify_io_error(io_error, Some("127.0.0.1:8080".to_string()));
        
        match result {
            TransferError::ConnectionRefused { address, recoverable } => {
                assert_eq!(address, "127.0.0.1:8080");
                assert!(recoverable);
            }
            _ => panic!("Expected ConnectionRefused error"),
        }
    }

    #[test]
    fn test_classify_timeout() {
        let io_error = Error::new(ErrorKind::TimedOut, "Operation timed out");
        let result = NetworkErrorDetector::classify_io_error(io_error, None);
        
        match result {
            TransferError::NetworkError { message, recoverable, .. } => {
                assert!(message.contains("timed out"));
                assert!(recoverable);
            }
            _ => panic!("Expected NetworkError for timeout"),
        }
    }

    #[test]
    fn test_error_pattern_analysis() {
        let errors = vec![
            TransferError::NetworkError { 
                message: "test".to_string(), 
                context: None, 
                recoverable: true 
            },
            TransferError::NetworkError { 
                message: "test2".to_string(), 
                context: None, 
                recoverable: true 
            },
            TransferError::Timeout { 
                seconds: 30, 
                operation: "test".to_string(), 
                recoverable: true 
            },
        ];

        let pattern = NetworkErrorDetector::analyze_error_pattern(&errors);
        assert!(matches!(pattern, ErrorPattern::NetworkInstability));
    }
}