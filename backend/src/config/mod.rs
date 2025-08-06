// Configuration management module
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Protocol {
    Tcp,
    Udp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferMode {
    Transmitter,
    Receiver,
}

impl std::str::FromStr for Protocol {
    type Err = String;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "tcp" => Ok(Protocol::Tcp),
            "udp" => Ok(Protocol::Udp),
            _ => Err(format!("Invalid protocol: {}", s)),
        }
    }
}

impl std::str::FromStr for TransferMode {
    type Err = String;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "transmitter" | "sender" | "send" => Ok(TransferMode::Transmitter),
            "receiver" | "receive" | "recv" => Ok(TransferMode::Receiver),
            _ => Err(format!("Invalid transfer mode: {}", s)),
        }
    }
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
        }
    }
}

impl TransferConfig {
    /// Validates the configuration and returns errors if invalid
    pub fn validate(&self) -> Result<(), String> {
        // Validate port range
        if self.port == 0 || self.port > 65535 {
            return Err(format!("Invalid port number: {}. Must be between 1 and 65535", self.port));
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
                if !is_valid_ip_address(ip) {
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
        };
        
        config.validate()?;
        Ok(config)
    }
}

/// Basic IP address validation
pub fn is_valid_ip_address(ip: &str) -> bool {
    use std::net::IpAddr;
    ip.parse::<IpAddr>().is_ok()
}



impl std::fmt::Display for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Protocol::Tcp => write!(f, "tcp"),
            Protocol::Udp => write!(f, "udp"),
        }
    }
}

impl std::fmt::Display for TransferMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferMode::Transmitter => write!(f, "transmitter"),
            TransferMode::Receiver => write!(f, "receiver"),
        }
    }
}

