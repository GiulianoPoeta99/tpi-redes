use crate::config::Protocol;
use crate::core::transfer::transfer_history_record::{TransferHistoryRecord, TransferMode, TransferHistoryStatus};

/// Filter for querying transfer history
#[derive(Debug, Clone)]
pub struct HistoryFilter {
    pub status: Option<TransferHistoryStatus>,
    pub protocol: Option<Protocol>,
    pub mode: Option<TransferMode>,
    pub filename_contains: Option<String>,
    pub from_timestamp: Option<u64>,
    pub to_timestamp: Option<u64>,
}

impl HistoryFilter {
    pub fn new() -> Self {
        Self {
            status: None,
            protocol: None,
            mode: None,
            filename_contains: None,
            from_timestamp: None,
            to_timestamp: None,
        }
    }

    pub fn with_status(mut self, status: TransferHistoryStatus) -> Self {
        self.status = Some(status);
        self
    }

    pub fn with_protocol(mut self, protocol: Protocol) -> Self {
        self.protocol = Some(protocol);
        self
    }

    pub fn with_mode(mut self, mode: TransferMode) -> Self {
        self.mode = Some(mode);
        self
    }

    pub fn with_filename_contains(mut self, filename: String) -> Self {
        self.filename_contains = Some(filename);
        self
    }

    pub fn with_time_range(mut self, from: u64, to: u64) -> Self {
        self.from_timestamp = Some(from);
        self.to_timestamp = Some(to);
        self
    }

    pub fn matches(&self, record: &TransferHistoryRecord) -> bool {
        if let Some(ref status) = self.status {
            if !matches!((&record.status, status), 
                (TransferHistoryStatus::Completed, TransferHistoryStatus::Completed) |
                (TransferHistoryStatus::Failed, TransferHistoryStatus::Failed) |
                (TransferHistoryStatus::Cancelled, TransferHistoryStatus::Cancelled)
            ) {
                return false;
            }
        }

        if let Some(ref protocol) = self.protocol {
            if !matches!((&record.protocol, protocol),
                (Protocol::Tcp, Protocol::Tcp) |
                (Protocol::Udp, Protocol::Udp)
            ) {
                return false;
            }
        }

        if let Some(ref mode) = self.mode {
            if !matches!((&record.mode, mode),
                (TransferMode::Sent, TransferMode::Sent) |
                (TransferMode::Received, TransferMode::Received)
            ) {
                return false;
            }
        }

        if let Some(ref filename) = self.filename_contains {
            if !record.filename.to_lowercase().contains(&filename.to_lowercase()) {
                return false;
            }
        }

        if let Some(from) = self.from_timestamp {
            if record.timestamp < from {
                return false;
            }
        }

        if let Some(to) = self.to_timestamp {
            if record.timestamp > to {
                return false;
            }
        }

        true
    }
}

impl Default for HistoryFilter {
    fn default() -> Self {
        Self::new()
    }
}