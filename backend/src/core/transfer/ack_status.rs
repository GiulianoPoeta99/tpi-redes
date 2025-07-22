use serde::{Deserialize, Serialize};

/// Acknowledgment status for data chunks
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AckStatus {
    Ok,
    Retry,
    Error,
}

impl std::fmt::Display for AckStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AckStatus::Ok => write!(f, "ok"),
            AckStatus::Retry => write!(f, "retry"),
            AckStatus::Error => write!(f, "error"),
        }
    }
}

impl AckStatus {
    /// Returns true if the acknowledgment indicates success
    pub fn is_success(&self) -> bool {
        matches!(self, AckStatus::Ok)
    }
    
    /// Returns true if the acknowledgment indicates a retry is needed
    pub fn needs_retry(&self) -> bool {
        matches!(self, AckStatus::Retry)
    }
    
    /// Returns true if the acknowledgment indicates an error
    pub fn is_error(&self) -> bool {
        matches!(self, AckStatus::Error)
    }
}