// Error handling utilities and helper functions
use crate::utils::errors::{TransferError, RetryConfig};
use std::path::Path;
use std::time::Duration;
use tokio::fs;
use tracing::{warn, debug};

/// Error context builder for adding contextual information to errors
pub struct ErrorContext {
    operation: Option<String>,
    file_path: Option<String>,
    transfer_id: Option<String>,
    address: Option<String>,
    protocol: Option<String>,
}

impl ErrorContext {
    pub fn new() -> Self {
        Self {
            operation: None,
            file_path: None,
            transfer_id: None,
            address: None,
            protocol: None,
        }
    }

    pub fn with_operation(mut self, operation: impl Into<String>) -> Self {
        self.operation = Some(operation.into());
        self
    }

    pub fn with_file_path(mut self, path: impl AsRef<Path>) -> Self {
        self.file_path = Some(path.as_ref().to_string_lossy().to_string());
        self
    }

    pub fn with_transfer_id(mut self, transfer_id: impl Into<String>) -> Self {
        self.transfer_id = Some(transfer_id.into());
        self
    }

    pub fn with_address(mut self, address: impl Into<String>) -> Self {
        self.address = Some(address.into());
        self
    }

    pub fn with_protocol(mut self, protocol: impl Into<String>) -> Self {
        self.protocol = Some(protocol.into());
        self
    }

    pub fn apply_to_error(self, mut error: TransferError) -> TransferError {
        // Add context based on error type
        match &mut error {
            TransferError::NetworkError { context, .. } => {
                if context.is_none() && self.operation.is_some() {
                    *context = self.operation;
                }
            }
            TransferError::FileError { file_path, .. } => {
                if file_path.is_none() && self.file_path.is_some() {
                    *file_path = self.file_path;
                }
            }
            TransferError::ProtocolError { protocol, .. } => {
                if protocol.is_empty() && self.protocol.is_some() {
                    *protocol = self.protocol.unwrap();
                }
            }
            TransferError::ConnectionRefused { address, .. } => {
                if address == "unknown" && self.address.is_some() {
                    *address = self.address.unwrap();
                }
            }
            TransferError::Timeout { operation, .. } => {
                if operation.is_empty() && self.operation.is_some() {
                    *operation = self.operation.unwrap();
                }
            }
            TransferError::Cancelled { transfer_id } => {
                if transfer_id.is_empty() && self.transfer_id.is_some() {
                    *transfer_id = self.transfer_id.unwrap();
                }
            }
            _ => {}
        }
        error
    }
}

/// File operation error helpers
pub struct FileErrorHelper;

impl FileErrorHelper {
    /// Check if a file exists and is accessible
    pub async fn validate_file_access(path: &Path, operation: &str) -> Result<(), TransferError> {
        if !path.exists() {
            return Err(TransferError::FileNotFound {
                path: path.to_string_lossy().to_string(),
            });
        }

        let metadata = fs::metadata(path).await.map_err(|e| {
            ErrorContext::new()
                .with_operation(format!("get metadata for {}", operation))
                .with_file_path(path)
                .apply_to_error(TransferError::from(e))
        })?;

        if !metadata.is_file() {
            return Err(TransferError::FileError {
                message: "Path is not a file".to_string(),
                file_path: Some(path.to_string_lossy().to_string()),
                recoverable: false,
            });
        }

        Ok(())
    }

    /// Check available disk space
    pub async fn check_disk_space(path: &Path, required_bytes: u64) -> Result<(), TransferError> {
        // This is a simplified implementation - in a real scenario you'd use platform-specific APIs
        // For now, we'll just check if the parent directory exists and is writable
        let parent = path.parent().unwrap_or(path);
        
        if !parent.exists() {
            return Err(TransferError::FileError {
                message: "Destination directory does not exist".to_string(),
                file_path: Some(parent.to_string_lossy().to_string()),
                recoverable: false,
            });
        }

        // Try to create a temporary file to test write permissions
        let temp_path = parent.join(".transfer_test");
        match fs::write(&temp_path, b"test").await {
            Ok(_) => {
                let _ = fs::remove_file(&temp_path).await;
                Ok(())
            }
            Err(e) => {
                Err(ErrorContext::new()
                    .with_operation("check write permissions")
                    .with_file_path(parent)
                    .apply_to_error(TransferError::from(e)))
            }
        }
    }

    /// Get file size safely
    pub async fn get_file_size(path: &Path) -> Result<u64, TransferError> {
        let metadata = fs::metadata(path).await.map_err(|e| {
            ErrorContext::new()
                .with_operation("get file size")
                .with_file_path(path)
                .apply_to_error(TransferError::from(e))
        })?;

        Ok(metadata.len())
    }
}

/// Network error helpers
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
    pub async fn check_connectivity(address: &str, timeout: Duration) -> Result<(), TransferError> {
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
}

/// Timeout utilities
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
}

/// Configuration validation helpers
pub struct ConfigValidator;

impl ConfigValidator {
    /// Validate port number
    pub fn validate_port(port: u16) -> Result<(), TransferError> {
        if port == 0 {
            return Err(TransferError::ConfigError {
                message: "Port cannot be 0".to_string(),
                field: Some("port".to_string()),
            });
        }

        if port < 1024 && port != 80 && port != 443 {
            warn!("Using privileged port {}, may require elevated permissions", port);
        }

        Ok(())
    }

    /// Validate IP address format
    pub fn validate_ip_address(ip: &str) -> Result<(), TransferError> {
        if ip.is_empty() {
            return Err(TransferError::ConfigError {
                message: "IP address cannot be empty".to_string(),
                field: Some("ip_address".to_string()),
            });
        }

        // Basic IP validation - in a real implementation you'd use a proper IP parsing library
        if ip == "localhost" || ip == "127.0.0.1" || ip == "::1" {
            return Ok(());
        }

        // IPv4 validation
        let parts: Vec<&str> = ip.split('.').collect();
        if parts.len() == 4 {
            for part in parts {
                match part.parse::<u8>() {
                    Ok(_) => continue,
                    Err(_) => break,
                }
            }
            return Ok(());
        }

        // IPv6 validation (simplified)
        if ip.contains(':') && ip.len() > 2 {
            return Ok(());
        }

        Err(TransferError::ConfigError {
            message: format!("Invalid IP address format: {}", ip),
            field: Some("ip_address".to_string()),
        })
    }

    /// Validate chunk size
    pub fn validate_chunk_size(chunk_size: usize) -> Result<(), TransferError> {
        if chunk_size == 0 {
            return Err(TransferError::ConfigError {
                message: "Chunk size cannot be 0".to_string(),
                field: Some("chunk_size".to_string()),
            });
        }

        if chunk_size > 1024 * 1024 {
            return Err(TransferError::ConfigError {
                message: "Chunk size cannot exceed 1MB".to_string(),
                field: Some("chunk_size".to_string()),
            });
        }

        Ok(())
    }

    /// Validate timeout duration
    pub fn validate_timeout(timeout: Duration) -> Result<(), TransferError> {
        if timeout.is_zero() {
            return Err(TransferError::ConfigError {
                message: "Timeout cannot be 0".to_string(),
                field: Some("timeout".to_string()),
            });
        }

        if timeout > Duration::from_secs(3600) {
            return Err(TransferError::ConfigError {
                message: "Timeout cannot exceed 1 hour".to_string(),
                field: Some("timeout".to_string()),
            });
        }

        Ok(())
    }
}

/// Error aggregation for collecting multiple validation errors
pub struct ErrorCollector {
    errors: Vec<TransferError>,
}

impl ErrorCollector {
    pub fn new() -> Self {
        Self {
            errors: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: TransferError) {
        self.errors.push(error);
    }

    pub fn add_result<T>(&mut self, result: Result<T, TransferError>) -> Option<T> {
        match result {
            Ok(value) => Some(value),
            Err(error) => {
                self.add_error(error);
                None
            }
        }
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    pub fn into_result<T>(self, success_value: T) -> Result<T, TransferError> {
        if self.errors.is_empty() {
            Ok(success_value)
        } else if self.errors.len() == 1 {
            Err(self.errors.into_iter().next().unwrap())
        } else {
            // Combine multiple errors into a single error
            let messages: Vec<String> = self.errors.iter().map(|e| e.to_string()).collect();
            Err(TransferError::ConfigError {
                message: format!("Multiple validation errors: {}", messages.join("; ")),
                field: None,
            })
        }
    }

    pub fn errors(&self) -> &[TransferError] {
        &self.errors
    }
}

/// Predefined retry configurations for common scenarios
pub struct RetryConfigs;

impl RetryConfigs {
    /// Quick retry for network operations
    pub fn network_quick() -> RetryConfig {
        RetryConfig {
            max_attempts: 3,
            initial_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(5),
            backoff_multiplier: 2.0,
            jitter: true,
        }
    }

    /// Aggressive retry for critical operations
    pub fn aggressive() -> RetryConfig {
        RetryConfig {
            max_attempts: 5,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 2.0,
            jitter: true,
        }
    }

    /// Conservative retry for file operations
    pub fn file_operations() -> RetryConfig {
        RetryConfig {
            max_attempts: 2,
            initial_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(10),
            backoff_multiplier: 2.0,
            jitter: false,
        }
    }

    /// No retry for configuration errors
    pub fn no_retry() -> RetryConfig {
        RetryConfig {
            max_attempts: 1,
            initial_delay: Duration::from_millis(0),
            max_delay: Duration::from_millis(0),
            backoff_multiplier: 1.0,
            jitter: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_file_validation() {
        let temp_file = NamedTempFile::new().unwrap();
        let result = FileErrorHelper::validate_file_access(temp_file.path(), "test").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_file_not_found() {
        let non_existent = std::path::Path::new("/non/existent/file.txt");
        let result = FileErrorHelper::validate_file_access(non_existent, "test").await;
        assert!(result.is_err());
        
        if let Err(TransferError::FileNotFound { path }) = result {
            assert_eq!(path, "/non/existent/file.txt");
        } else {
            panic!("Expected FileNotFound error");
        }
    }

    #[test]
    fn test_config_validation() {
        assert!(ConfigValidator::validate_port(8080).is_ok());
        assert!(ConfigValidator::validate_port(0).is_err());
        
        assert!(ConfigValidator::validate_ip_address("127.0.0.1").is_ok());
        assert!(ConfigValidator::validate_ip_address("localhost").is_ok());
        assert!(ConfigValidator::validate_ip_address("invalid").is_err());
        
        assert!(ConfigValidator::validate_chunk_size(8192).is_ok());
        assert!(ConfigValidator::validate_chunk_size(0).is_err());
        assert!(ConfigValidator::validate_chunk_size(2 * 1024 * 1024).is_err());
    }

    #[test]
    fn test_error_collector() {
        let mut collector = ErrorCollector::new();
        
        collector.add_error(TransferError::ConfigError {
            message: "Test error 1".to_string(),
            field: None,
        });
        
        collector.add_error(TransferError::ConfigError {
            message: "Test error 2".to_string(),
            field: None,
        });
        
        assert!(collector.has_errors());
        assert_eq!(collector.errors().len(), 2);
        
        let result = collector.into_result(());
        assert!(result.is_err());
    }
}