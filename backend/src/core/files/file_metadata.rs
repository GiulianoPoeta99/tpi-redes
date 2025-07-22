use crate::errors::TransferError;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// File metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub size: u64,
    pub file_type: String,
    pub checksum: Option<String>,
    pub created: Option<std::time::SystemTime>,
    pub modified: Option<std::time::SystemTime>,
}

impl FileMetadata {
    /// Extract metadata from a file path
    pub async fn from_path(path: &Path) -> Result<Self, TransferError> {
        let metadata = tokio::fs::metadata(path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to read metadata for {}: {}", path.display(), e),
            file_path: Some(path.display().to_string()),
            recoverable: false,
        })?;
        
        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
            
        let file_type = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_string();
            
        let created = metadata.created().ok();
        let modified = metadata.modified().ok();
        
        Ok(Self {
            name,
            size: metadata.len(),
            file_type,
            checksum: None,
            created,
            modified,
        })
    }
    
    /// Validate file size against limits
    pub fn validate_size(&self, max_size: u64) -> Result<(), TransferError> {
        if self.size > max_size {
            return Err(TransferError::FileError {
                message: format!(
                    "File size {} bytes exceeds maximum allowed size {} bytes",
                    self.size, max_size
                ),
                file_path: Some(self.name.clone()),
                recoverable: false,
            });
        }
        Ok(())
    }
    
    /// Check if file type is allowed
    pub fn validate_type(&self, allowed_types: &[&str]) -> Result<(), TransferError> {
        if !allowed_types.is_empty() && !allowed_types.contains(&self.file_type.as_str()) {
            return Err(TransferError::FileError {
                message: format!(
                    "File type '{}' is not allowed. Allowed types: {:?}",
                    self.file_type, allowed_types
                ),
                file_path: Some(self.name.clone()),
                recoverable: false,
            });
        }
        Ok(())
    }
}