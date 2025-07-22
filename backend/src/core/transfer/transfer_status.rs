use serde::{Deserialize, Serialize};

/// Status of a file transfer operation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransferStatus {
    Idle,
    Connecting,
    Transferring,
    Completed,
    Error,
    Cancelled,
}

impl std::fmt::Display for TransferStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferStatus::Idle => write!(f, "idle"),
            TransferStatus::Connecting => write!(f, "connecting"),
            TransferStatus::Transferring => write!(f, "transferring"),
            TransferStatus::Completed => write!(f, "completed"),
            TransferStatus::Error => write!(f, "error"),
            TransferStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

impl TransferStatus {
    /// Returns true if the transfer is in a terminal state (completed or error)
    pub fn is_terminal(&self) -> bool {
        matches!(self, TransferStatus::Completed | TransferStatus::Error | TransferStatus::Cancelled)
    }
    
    /// Returns true if the transfer is currently active
    pub fn is_active(&self) -> bool {
        matches!(self, TransferStatus::Connecting | TransferStatus::Transferring)
    }
}