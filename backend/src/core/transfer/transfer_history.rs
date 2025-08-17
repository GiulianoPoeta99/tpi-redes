use std::path::PathBuf;
use tokio::fs;
use tracing::{debug, error, warn};

use crate::errors::TransferError;
use crate::core::transfer::transfer_history_record::TransferHistoryRecord;
use crate::core::transfer::history_filter::HistoryFilter;

/// Manages persistent storage of transfer history
pub struct TransferHistoryManager {
    storage_path: PathBuf,
    max_records: usize,
}

impl TransferHistoryManager {
    pub fn new(storage_path: PathBuf, max_records: usize) -> Self {
        Self {
            storage_path,
            max_records,
        }
    }

    /// Add a new transfer record to history
    pub async fn add_record(&self, record: TransferHistoryRecord) -> Result<(), TransferError> {
        let mut history = self.load_history().await?;
        
        // Add new record at the beginning
        history.insert(0, record);
        
        // Limit the number of records
        if history.len() > self.max_records {
            history.truncate(self.max_records);
        }
        
        self.save_history(&history).await?;
        
        debug!("Added transfer record to history, total records: {}", history.len());
        Ok(())
    }

    /// Load all transfer history records
    pub async fn load_history(&self) -> Result<Vec<TransferHistoryRecord>, TransferError> {
        if !self.storage_path.exists() {
            return Ok(Vec::new());
        }

        match fs::read_to_string(&self.storage_path).await {
            Ok(content) => {
                match serde_json::from_str::<Vec<TransferHistoryRecord>>(&content) {
                    Ok(history) => Ok(history),
                    Err(e) => {
                        warn!("Failed to parse history file, creating new: {}", e);
                        Ok(Vec::new())
                    }
                }
            }
            Err(e) => {
                error!("Failed to read history file: {}", e);
                Err(TransferError::FileError {
                    message: format!("Failed to read history file: {}", e),
                    file_path: Some(self.storage_path.to_string_lossy().to_string()),
                    recoverable: true,
                })
            }
        }
    }

    /// Save history records to storage
    async fn save_history(&self, history: &[TransferHistoryRecord]) -> Result<(), TransferError> {
        // Ensure parent directory exists
        if let Some(parent) = self.storage_path.parent() {
            if let Err(e) = fs::create_dir_all(parent).await {
                return Err(TransferError::FileError {
                    message: format!("Failed to create history directory: {}", e),
                    file_path: Some(parent.to_string_lossy().to_string()),
                    recoverable: false,
                });
            }
        }

        let content = match serde_json::to_string_pretty(history) {
            Ok(content) => content,
            Err(e) => {
                return Err(TransferError::FileError {
                    message: format!("Failed to serialize history: {}", e),
                    file_path: Some(self.storage_path.to_string_lossy().to_string()),
                    recoverable: false,
                });
            }
        };

        if let Err(e) = fs::write(&self.storage_path, content).await {
            return Err(TransferError::FileError {
                message: format!("Failed to write history file: {}", e),
                file_path: Some(self.storage_path.to_string_lossy().to_string()),
                recoverable: true,
            });
        }

        debug!("Saved {} history records", history.len());
        Ok(())
    }

    /// Clear all history records
    pub async fn clear_history(&self) -> Result<(), TransferError> {
        if self.storage_path.exists() {
            if let Err(e) = fs::remove_file(&self.storage_path).await {
                return Err(TransferError::FileError {
                    message: format!("Failed to clear history file: {}", e),
                    file_path: Some(self.storage_path.to_string_lossy().to_string()),
                    recoverable: true,
                });
            }
        }
        
        debug!("Cleared transfer history");
        Ok(())
    }

    /// Get filtered history records
    pub async fn get_filtered_history(
        &self,
        filter: &HistoryFilter,
    ) -> Result<Vec<TransferHistoryRecord>, TransferError> {
        let history = self.load_history().await?;
        
        let filtered: Vec<TransferHistoryRecord> = history
            .into_iter()
            .filter(|record| filter.matches(record))
            .collect();
        
        Ok(filtered)
    }

    /// Export history to a specific file
    pub async fn export_history(&self, export_path: &PathBuf) -> Result<(), TransferError> {
        let history = self.load_history().await?;
        
        let content = match serde_json::to_string_pretty(&history) {
            Ok(content) => content,
            Err(e) => {
                return Err(TransferError::FileError {
                    message: format!("Failed to serialize history for export: {}", e),
                    file_path: Some(export_path.to_string_lossy().to_string()),
                    recoverable: false,
                });
            }
        };

        if let Err(e) = fs::write(export_path, content).await {
            return Err(TransferError::FileError {
                message: format!("Failed to export history: {}", e),
                file_path: Some(export_path.to_string_lossy().to_string()),
                recoverable: true,
            });
        }

        debug!("Exported {} history records to {:?}", history.len(), export_path);
        Ok(())
    }

    /// Import history from a file
    pub async fn import_history(&self, import_path: &PathBuf) -> Result<usize, TransferError> {
        let content = match fs::read_to_string(import_path).await {
            Ok(content) => content,
            Err(e) => {
                return Err(TransferError::FileError {
                    message: format!("Failed to read import file: {}", e),
                    file_path: Some(import_path.to_string_lossy().to_string()),
                    recoverable: true,
                });
            }
        };

        let imported_history: Vec<TransferHistoryRecord> = match serde_json::from_str(&content) {
            Ok(history) => history,
            Err(e) => {
                return Err(TransferError::FileError {
                    message: format!("Failed to parse import file: {}", e),
                    file_path: Some(import_path.to_string_lossy().to_string()),
                    recoverable: false,
                });
            }
        };

        let mut current_history = self.load_history().await?;
        let import_count = imported_history.len();
        
        // Merge histories, avoiding duplicates by ID
        for record in imported_history {
            if !current_history.iter().any(|r| r.id == record.id) {
                current_history.push(record);
            }
        }

        // Sort by timestamp (newest first)
        current_history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Limit records
        if current_history.len() > self.max_records {
            current_history.truncate(self.max_records);
        }

        self.save_history(&current_history).await?;
        
        debug!("Imported {} history records", import_count);
        Ok(import_count)
    }
}

