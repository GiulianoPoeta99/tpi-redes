// Transfer configuration structure
use crate::config::{Protocol, TransferMode};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferConfig {
    pub mode: TransferMode,
    pub protocol: Protocol,
    pub target_ip: Option<String>,
    pub port: u16,
    pub filename: Option<String>,
    pub chunk_size: usize,
    pub timeout: Duration,
    pub connection_timeout: Duration,
    pub read_timeout: Duration,
    pub write_timeout: Duration,
    pub retry_attempts: u32,
    pub retry_delay: Duration,
    pub auto_retry_enabled: bool,
}

impl Default for TransferConfig {
    fn default() -> Self {
        Self {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: None,
            port: 8080,
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(30),
            connection_timeout: Duration::from_secs(10),
            read_timeout: Duration::from_secs(30),
            write_timeout: Duration::from_secs(30),
            retry_attempts: 3,
            retry_delay: Duration::from_secs(1),
            auto_retry_enabled: true,
        }
    }
}

impl TransferConfig {
    /// Validates the configuration and returns errors if invalid
    pub fn validate(&self) -> Result<(), String> {
        // Validate port range
        if self.port == 0 {
            return Err(format!("Invalid port number: {}. Must be greater than 0", self.port));
        }
        
        // Validate chunk size
        if self.chunk_size == 0 {
            return Err("Chunk size must be greater than 0".to_string());
        }
        
        if self.chunk_size > 1024 * 1024 {
            return Err("Chunk size must not exceed 1MB".to_string());
        }
        
        // Validate timeout
        if self.timeout.as_secs() == 0 {
            return Err("Timeout must be greater than 0 seconds".to_string());
        }
        
        if self.timeout.as_secs() > 3600 {
            return Err("Timeout must not exceed 1 hour".to_string());
        }
        
        // Validate connection timeout
        if self.connection_timeout.as_secs() == 0 {
            return Err("Connection timeout must be greater than 0 seconds".to_string());
        }
        
        // Validate read/write timeouts
        if self.read_timeout.as_secs() == 0 {
            return Err("Read timeout must be greater than 0 seconds".to_string());
        }
        
        if self.write_timeout.as_secs() == 0 {
            return Err("Write timeout must be greater than 0 seconds".to_string());
        }
        
        // Validate retry configuration
        if self.retry_attempts > 10 {
            return Err("Retry attempts must not exceed 10".to_string());
        }
        
        if self.retry_delay.as_secs() > 60 {
            return Err("Retry delay must not exceed 60 seconds".to_string());
        }
        
        // Validate target IP for transmitter mode
        if matches!(self.mode, TransferMode::Transmitter) {
            if self.target_ip.is_none() {
                return Err("Target IP address is required for transmitter mode".to_string());
            }
            
            if let Some(ref ip) = self.target_ip {
                if ip.trim().is_empty() {
                    return Err("Target IP address cannot be empty".to_string());
                }
                
                // Basic IP validation (more thorough validation could be added)
                if !crate::config::validation::is_valid_ip_address(ip) {
                    return Err(format!("Invalid IP address format: {}", ip));
                }
            }
        }
        
        Ok(())
    }
    
    /// Creates a new configuration with validated values
    pub fn new(
        mode: TransferMode,
        protocol: Protocol,
        target_ip: Option<String>,
        port: u16,
        filename: Option<String>,
        chunk_size: Option<usize>,
        timeout: Option<Duration>,
    ) -> Result<Self, String> {
        let config = Self {
            mode,
            protocol,
            target_ip,
            port,
            filename,
            chunk_size: chunk_size.unwrap_or(8192),
            timeout: timeout.unwrap_or(Duration::from_secs(30)),
            ..Default::default()
        };
        
        config.validate()?;
        Ok(config)
    }
    
    /// Creates a configuration with custom timeout settings
    pub fn with_timeouts(
        mut self,
        connection_timeout: Duration,
        read_timeout: Duration,
        write_timeout: Duration,
    ) -> Self {
        self.connection_timeout = connection_timeout;
        self.read_timeout = read_timeout;
        self.write_timeout = write_timeout;
        self
    }
    
    /// Creates a configuration with custom retry settings
    pub fn with_retry_config(
        mut self,
        retry_attempts: u32,
        retry_delay: Duration,
        auto_retry_enabled: bool,
    ) -> Self {
        self.retry_attempts = retry_attempts;
        self.retry_delay = retry_delay;
        self.auto_retry_enabled = auto_retry_enabled;
        self
    }
    
    /// Gets the appropriate timeout for the given operation
    pub fn get_timeout_for_operation(&self, operation: &str) -> Duration {
        match operation {
            "connect" | "connection" => self.connection_timeout,
            "read" | "receive" => self.read_timeout,
            "write" | "send" => self.write_timeout,
            _ => self.timeout,
        }
    }
}