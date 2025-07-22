// Configuration validation helpers
use crate::errors::TransferError;
use std::time::Duration;
use tracing::warn;

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

    /// Create a configuration error
    pub fn create_config_error(
        message: impl Into<String>,
        field: Option<String>,
    ) -> TransferError {
        TransferError::ConfigError {
            message: message.into(),
            field,
        }
    }
}