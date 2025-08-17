use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::{debug, info, warn, error};

use crate::core::transfer::network_log_entry::{NetworkLogEntry, LogLevel, LogCategory};

/// Logger for detailed transfer operations with developer mode support
pub struct TransferLogger {
    transfer_id: String,
    logs: Vec<NetworkLogEntry>,
    developer_mode: bool,
}

impl TransferLogger {
    pub fn new(transfer_id: String, developer_mode: bool) -> Self {
        Self {
            transfer_id,
            logs: Vec::new(),
            developer_mode,
        }
    }

    pub fn log_connection(&mut self, message: &str, metadata: HashMap<String, String>) {
        self.add_log(LogLevel::Info, LogCategory::Connection, message, metadata);
    }

    pub fn log_protocol(&mut self, message: &str, metadata: HashMap<String, String>) {
        self.add_log(LogLevel::Debug, LogCategory::Protocol, message, metadata);
    }

    pub fn log_file_operation(&mut self, message: &str, metadata: HashMap<String, String>) {
        self.add_log(LogLevel::Info, LogCategory::FileOperation, message, metadata);
    }

    pub fn log_checksum(&mut self, message: &str, metadata: HashMap<String, String>) {
        self.add_log(LogLevel::Info, LogCategory::Checksum, message, metadata);
    }

    pub fn log_error(&mut self, message: &str, metadata: HashMap<String, String>) {
        self.add_log(LogLevel::Error, LogCategory::Error, message, metadata);
    }

    pub fn log_performance(&mut self, message: &str, metadata: HashMap<String, String>) {
        self.add_log(LogLevel::Debug, LogCategory::Performance, message, metadata);
    }

    fn add_log(&mut self, level: LogLevel, category: LogCategory, message: &str, metadata: HashMap<String, String>) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::ZERO)
            .as_millis() as u64;

        let entry = NetworkLogEntry {
            timestamp,
            transfer_id: self.transfer_id.clone(),
            level: level.clone(),
            category: category.clone(),
            message: message.to_string(),
            metadata,
        };

        // Log to tracing system
        match level {
            LogLevel::Debug => debug!(
                transfer_id = %self.transfer_id,
                category = ?category,
                metadata = ?entry.metadata,
                "{}",
                message
            ),
            LogLevel::Info => info!(
                transfer_id = %self.transfer_id,
                category = ?category,
                metadata = ?entry.metadata,
                "{}",
                message
            ),
            LogLevel::Warn => warn!(
                transfer_id = %self.transfer_id,
                category = ?category,
                metadata = ?entry.metadata,
                "{}",
                message
            ),
            LogLevel::Error => error!(
                transfer_id = %self.transfer_id,
                category = ?category,
                metadata = ?entry.metadata,
                "{}",
                message
            ),
        }

        // Store detailed logs if in developer mode
        if self.developer_mode {
            self.logs.push(entry);
        }
    }

    pub fn get_logs(&self) -> &[NetworkLogEntry] {
        &self.logs
    }

    pub fn clear_logs(&mut self) {
        self.logs.clear();
    }

    pub fn export_logs(&self) -> Vec<NetworkLogEntry> {
        self.logs.clone()
    }
}