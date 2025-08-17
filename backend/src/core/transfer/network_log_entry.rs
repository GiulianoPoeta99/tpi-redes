use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Detailed log entry for network operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkLogEntry {
    pub timestamp: u64,
    pub transfer_id: String,
    pub level: LogLevel,
    pub category: LogCategory,
    pub message: String,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogCategory {
    Connection,
    Protocol,
    FileOperation,
    Checksum,
    Error,
    Performance,
}