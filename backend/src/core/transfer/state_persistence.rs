// State persistence for transfer sessions
use crate::errors::TransferError;
use crate::core::transfer::{TransferSession, SerializableTransferSession};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tracing::{debug, warn};

pub struct StatePersistence {
    storage_path: PathBuf,
}

impl StatePersistence {
    pub fn new(storage_path: PathBuf) -> Self {
        Self { storage_path }
    }

    pub async fn save_session(&self, session: &TransferSession) -> Result<(), TransferError> {
        // Create storage directory if it doesn't exist
        if let Some(parent) = self.storage_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).await.map_err(|e| {
                    TransferError::FileError {
                        message: format!("Failed to create storage directory: {}", e),
                        file_path: Some(parent.to_string_lossy().to_string()),
                        recoverable: false,
                    }
                })?;
            }
        }

        let serializable = SerializableTransferSession::from(session);
        let json = serde_json::to_string_pretty(&serializable).map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to serialize session: {}", e),
                file_path: None,
                recoverable: false,
            }
        })?;

        let session_file = self.storage_path.join(format!("{}.json", session.id));
        fs::write(&session_file, json).await.map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to write session file: {}", e),
                file_path: Some(session_file.to_string_lossy().to_string()),
                recoverable: true,
            }
        })?;

        debug!("Saved session {} to {}", session.id, session_file.display());
        Ok(())
    }

    pub async fn load_session(&self, session_id: &str) -> Result<TransferSession, TransferError> {
        let session_file = self.storage_path.join(format!("{}.json", session_id));
        
        if !session_file.exists() {
            return Err(TransferError::FileNotFound {
                path: session_file.to_string_lossy().to_string(),
            });
        }

        let json = fs::read_to_string(&session_file).await.map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to read session file: {}", e),
                file_path: Some(session_file.to_string_lossy().to_string()),
                recoverable: true,
            }
        })?;

        let serializable: SerializableTransferSession = serde_json::from_str(&json).map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to deserialize session: {}", e),
                file_path: Some(session_file.to_string_lossy().to_string()),
                recoverable: false,
            }
        })?;

        debug!("Loaded session {} from {}", session_id, session_file.display());
        Ok(TransferSession::from(serializable))
    }

    pub async fn load_all_sessions(&self) -> Result<HashMap<String, TransferSession>, TransferError> {
        let mut sessions = HashMap::new();

        if !self.storage_path.exists() {
            debug!("Storage path does not exist: {}", self.storage_path.display());
            return Ok(sessions);
        }

        let mut entries = fs::read_dir(&self.storage_path).await.map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to read storage directory: {}", e),
                file_path: Some(self.storage_path.to_string_lossy().to_string()),
                recoverable: true,
            }
        })?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to read directory entry: {}", e),
                file_path: Some(self.storage_path.to_string_lossy().to_string()),
                recoverable: true,
            }
        })? {
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    match self.load_session(stem).await {
                        Ok(session) => {
                            sessions.insert(session.id.clone(), session);
                        }
                        Err(e) => {
                            warn!("Failed to load session from {}: {}", path.display(), e);
                        }
                    }
                }
            }
        }

        debug!("Loaded {} sessions from storage", sessions.len());
        Ok(sessions)
    }

    /// Load sessions (legacy method name for compatibility)
    pub async fn load_sessions(&self) -> Result<HashMap<String, TransferSession>, TransferError> {
        self.load_all_sessions().await
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), TransferError> {
        let session_file = self.storage_path.join(format!("{}.json", session_id));
        
        if session_file.exists() {
            fs::remove_file(&session_file).await.map_err(|e| {
                TransferError::FileError {
                    message: format!("Failed to delete session file: {}", e),
                    file_path: Some(session_file.to_string_lossy().to_string()),
                    recoverable: true,
                }
            })?;
            debug!("Deleted session file: {}", session_file.display());
        }

        Ok(())
    }

    pub async fn cleanup_old_sessions(&self, max_age_days: u64) -> Result<u32, TransferError> {
        let mut cleaned_count = 0;
        let cutoff_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() - (max_age_days * 24 * 60 * 60);

        if !self.storage_path.exists() {
            return Ok(0);
        }

        let mut entries = fs::read_dir(&self.storage_path).await.map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to read storage directory: {}", e),
                file_path: Some(self.storage_path.to_string_lossy().to_string()),
                recoverable: true,
            }
        })?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| {
            TransferError::FileError {
                message: format!("Failed to read directory entry: {}", e),
                file_path: Some(self.storage_path.to_string_lossy().to_string()),
                recoverable: true,
            }
        })? {
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(metadata) = fs::metadata(&path).await {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                            if duration.as_secs() < cutoff_time {
                                if fs::remove_file(&path).await.is_ok() {
                                    cleaned_count += 1;
                                    debug!("Cleaned up old session file: {}", path.display());
                                }
                            }
                        }
                    }
                }
            }
        }

        debug!("Cleaned up {} old session files", cleaned_count);
        Ok(cleaned_count)
    }
}