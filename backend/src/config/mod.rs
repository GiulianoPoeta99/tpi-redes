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