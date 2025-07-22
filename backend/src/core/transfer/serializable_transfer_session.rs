// Serializable version of TransferSession for persistence
use crate::config::TransferConfig;
use crate::core::transfer::{TransferProgress, TransferStatus, TransferSession};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, atomic::AtomicBool};

#[derive(Serialize, Deserialize)]
pub struct SerializableTransferSession {
    pub id: String,
    pub config: TransferConfig,
    pub file_path: Option<PathBuf>,
    pub target_address: Option<String>,
    pub status: TransferStatus,
    pub progress: TransferProgress,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub error: Option<String>,
    pub checksum: Option<String>,
}

impl From<&TransferSession> for SerializableTransferSession {
    fn from(session: &TransferSession) -> Self {
        Self {
            id: session.id.clone(),
            config: session.config.clone(),
            file_path: session.file_path.clone(),
            target_address: session.target_address.clone(),
            status: session.status.clone(),
            progress: session.progress.clone(),
            bytes_transferred: session.bytes_transferred,
            total_bytes: session.total_bytes,
            error: session.error.clone(),
            checksum: session.checksum.clone(),
        }
    }
}

impl From<SerializableTransferSession> for TransferSession {
    fn from(serializable: SerializableTransferSession) -> Self {
        Self {
            id: serializable.id,
            config: serializable.config,
            file_path: serializable.file_path,
            target_address: serializable.target_address,
            status: serializable.status,
            progress: serializable.progress,
            start_time: None, // Not serialized
            end_time: None,   // Not serialized
            bytes_transferred: serializable.bytes_transferred,
            total_bytes: serializable.total_bytes,
            error: serializable.error,
            checksum: serializable.checksum,
            cancellation_flag: Arc::new(AtomicBool::new(false)),
        }
    }
}