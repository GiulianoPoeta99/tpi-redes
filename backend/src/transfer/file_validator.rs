use crate::transfer::file_metadata::FileMetadata;
use crate::utils::errors::TransferError;
use std::path::Path;
use tokio::fs::{File, OpenOptions};

/// File validation utilities
pub struct FileValidator;

impl FileValidator {
    /// Default maximum file size (1GB)
    pub const DEFAULT_MAX_SIZE: u64 = 1024 * 1024 * 1024;
    
    /// Validate a file for transfer
    pub async fn validate_file(
        path: &Path,
        max_size: Option<u64>,
        allowed_types: Option<&[&str]>,
    ) -> Result<FileMetadata, TransferError> {
        // Check if file exists
        if !path.exists() {
            return Err(TransferError::FileError {
                message: format!("File does not exist: {}", path.display()),
                file_path: Some(path.display().to_string()),
                recoverable: false,
            });
        }
        
        // Check if it's a file (not a directory)
        if !path.is_file() {
            return Err(TransferError::FileError {
                message: format!("Path is not a file: {}", path.display()),
                file_path: Some(path.display().to_string()),
                recoverable: false,
            });
        }
        
        // Extract metadata
        let metadata = FileMetadata::from_path(path).await?;
        
        // Validate size
        let max_size = max_size.unwrap_or(Self::DEFAULT_MAX_SIZE);
        metadata.validate_size(max_size)?;
        
        // Validate type if restrictions are specified
        if let Some(types) = allowed_types {
            metadata.validate_type(types)?;
        }
        
        Ok(metadata)
    }
    
    /// Check if a file is readable
    pub async fn check_readable(path: &Path) -> Result<(), TransferError> {
        File::open(path).await.map_err(|e| TransferError::FileError {
            message: format!("File is not readable {}: {}", path.display(), e),
            file_path: Some(path.display().to_string()),
            recoverable: false,
        })?;
        Ok(())
    }
    
    /// Check if a directory is writable
    pub async fn check_writable_dir(dir: &Path) -> Result<(), TransferError> {
        if !dir.exists() {
            return Err(TransferError::FileError {
                message: format!("Directory does not exist: {}", dir.display()),
                file_path: Some(dir.display().to_string()),
                recoverable: false,
            });
        }
        
        if !dir.is_dir() {
            return Err(TransferError::FileError {
                message: format!("Path is not a directory: {}", dir.display()),
                file_path: Some(dir.display().to_string()),
                recoverable: false,
            });
        }
        
        // Try to create a temporary file to test write permissions
        let test_file = dir.join(".write_test");
        match OpenOptions::new().create(true).write(true).open(&test_file).await {
            Ok(_) => {
                // Clean up test file
                let _ = tokio::fs::remove_file(&test_file).await;
                Ok(())
            }
            Err(e) => Err(TransferError::FileError {
                message: format!("Directory is not writable {}: {}", dir.display(), e),
                file_path: Some(dir.display().to_string()),
                recoverable: false,
            }),
        }
    }
}