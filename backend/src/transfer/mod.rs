// File transfer logic module
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub progress: f64,        // 0.0 - 1.0
    pub speed: f64,           // bytes per second
    pub eta: u64,             // seconds remaining
    pub status: TransferStatus,
    pub error: Option<String>,
}

impl TransferProgress {
    /// Creates a new transfer progress with initial values
    pub fn new(transfer_id: String) -> Self {
        Self {
            transfer_id,
            progress: 0.0,
            speed: 0.0,
            eta: 0,
            status: TransferStatus::Idle,
            error: None,
        }
    }
    
    /// Updates the progress with new values
    pub fn update(&mut self, progress: f64, speed: f64, eta: u64) {
        self.progress = progress.clamp(0.0, 1.0);
        self.speed = speed.max(0.0);
        self.eta = eta;
        
        if self.progress >= 1.0 && self.status == TransferStatus::Transferring {
            self.status = TransferStatus::Completed;
        }
    }
    
    /// Sets an error state
    pub fn set_error(&mut self, error: String) {
        self.status = TransferStatus::Error;
        self.error = Some(error);
    }
    
    /// Returns the progress as a percentage (0-100)
    pub fn progress_percentage(&self) -> f64 {
        self.progress * 100.0
    }
    
    /// Returns the speed in a human-readable format
    pub fn speed_human_readable(&self) -> String {
        if self.speed < 1024.0 {
            format!("{:.1} B/s", self.speed)
        } else if self.speed < 1024.0 * 1024.0 {
            format!("{:.1} KB/s", self.speed / 1024.0)
        } else if self.speed < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.1} MB/s", self.speed / (1024.0 * 1024.0))
        } else {
            format!("{:.1} GB/s", self.speed / (1024.0 * 1024.0 * 1024.0))
        }
    }
    
    /// Returns the ETA in a human-readable format
    pub fn eta_human_readable(&self) -> String {
        if self.eta == 0 {
            return "Unknown".to_string();
        }
        
        let hours = self.eta / 3600;
        let minutes = (self.eta % 3600) / 60;
        let seconds = self.eta % 60;
        
        if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, seconds)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, seconds)
        } else {
            format!("{}s", seconds)
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransferStatus {
    Idle,
    Connecting,
    Transferring,
    Completed,
    Error,
}

impl std::fmt::Display for TransferStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferStatus::Idle => write!(f, "idle"),
            TransferStatus::Connecting => write!(f, "connecting"),
            TransferStatus::Transferring => write!(f, "transferring"),
            TransferStatus::Completed => write!(f, "completed"),
            TransferStatus::Error => write!(f, "error"),
        }
    }
}

impl TransferStatus {
    /// Returns true if the transfer is in a terminal state (completed or error)
    pub fn is_terminal(&self) -> bool {
        matches!(self, TransferStatus::Completed | TransferStatus::Error)
    }
    
    /// Returns true if the transfer is currently active
    pub fn is_active(&self) -> bool {
        matches!(self, TransferStatus::Connecting | TransferStatus::Transferring)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferResult {
    pub success: bool,
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: Duration,
    pub checksum: String,
    pub error: Option<String>,
}

impl TransferResult {
    /// Creates a successful transfer result
    pub fn success(
        transfer_id: String,
        bytes_transferred: u64,
        duration: Duration,
        checksum: String,
    ) -> Self {
        Self {
            success: true,
            transfer_id,
            bytes_transferred,
            duration,
            checksum,
            error: None,
        }
    }
    
    /// Creates a failed transfer result
    pub fn failure(transfer_id: String, error: String) -> Self {
        Self {
            success: false,
            transfer_id,
            bytes_transferred: 0,
            duration: Duration::from_secs(0),
            checksum: String::new(),
            error: Some(error),
        }
    }
    
    /// Returns the average transfer speed in bytes per second
    pub fn average_speed(&self) -> f64 {
        if self.duration.as_secs_f64() > 0.0 {
            self.bytes_transferred as f64 / self.duration.as_secs_f64()
        } else {
            0.0
        }
    }
    
    /// Returns the transfer speed in a human-readable format
    pub fn speed_human_readable(&self) -> String {
        let speed = self.average_speed();
        if speed < 1024.0 {
            format!("{:.1} B/s", speed)
        } else if speed < 1024.0 * 1024.0 {
            format!("{:.1} KB/s", speed / 1024.0)
        } else if speed < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.1} MB/s", speed / (1024.0 * 1024.0))
        } else {
            format!("{:.1} GB/s", speed / (1024.0 * 1024.0 * 1024.0))
        }
    }
    
    /// Returns the bytes transferred in a human-readable format
    pub fn bytes_human_readable(&self) -> String {
        let bytes = self.bytes_transferred as f64;
        if bytes < 1024.0 {
            format!("{} B", self.bytes_transferred)
        } else if bytes < 1024.0 * 1024.0 {
            format!("{:.1} KB", bytes / 1024.0)
        } else if bytes < 1024.0 * 1024.0 * 1024.0 {
            format!("{:.1} MB", bytes / (1024.0 * 1024.0))
        } else {
            format!("{:.1} GB", bytes / (1024.0 * 1024.0 * 1024.0))
        }
    }
}

// File operations and validation
use std::path::{Path, PathBuf};
use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, SeekFrom};
use crate::utils::errors::TransferError;

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
        let mut metadata = FileMetadata::from_path(path).await?;
        
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

// File chunking functionality
pub struct FileChunker {
    file_path: PathBuf,
    chunk_size: usize,
    total_chunks: usize,
    file_size: u64,
}

impl FileChunker {
    /// Create a new file chunker for reading
    pub async fn new_reader(file_path: PathBuf, chunk_size: usize) -> Result<Self, TransferError> {
        let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to read file metadata: {}", e),
            file_path: Some(file_path.display().to_string()),
            recoverable: false,
        })?;
        
        let file_size = metadata.len();
        let total_chunks = ((file_size as f64) / (chunk_size as f64)).ceil() as usize;
        
        Ok(Self {
            file_path,
            chunk_size,
            total_chunks,
            file_size,
        })
    }
    
    /// Create a new file chunker for writing
    pub async fn new_writer(file_path: PathBuf, file_size: u64, chunk_size: usize) -> Result<Self, TransferError> {
        let total_chunks = ((file_size as f64) / (chunk_size as f64)).ceil() as usize;
        
        // Create the file if it doesn't exist
        OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&file_path)
            .await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to create output file: {}", e),
                file_path: Some(file_path.display().to_string()),
                recoverable: false,
            })?;
        
        Ok(Self {
            file_path,
            chunk_size,
            total_chunks,
            file_size,
        })
    }
    
    /// Read a specific chunk from the file
    pub async fn read_chunk(&self, chunk_id: u32) -> Result<Vec<u8>, TransferError> {
        if chunk_id as usize >= self.total_chunks {
            return Err(TransferError::FileError {
                message: format!("Chunk ID {} exceeds total chunks {}", chunk_id, self.total_chunks),
                file_path: Some(self.file_path.display().to_string()),
                recoverable: false,
            });
        }
        
        let mut file = File::open(&self.file_path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to open file for reading: {}", e),
            file_path: Some(self.file_path.display().to_string()),
            recoverable: false,
        })?;
        
        let offset = (chunk_id as u64) * (self.chunk_size as u64);
        file.seek(SeekFrom::Start(offset)).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to seek to chunk position: {}", e),
            file_path: Some(self.file_path.display().to_string()),
            recoverable: false,
        })?;
        
        // Calculate the actual chunk size (last chunk might be smaller)
        let remaining_bytes = self.file_size - offset;
        let actual_chunk_size = std::cmp::min(self.chunk_size as u64, remaining_bytes) as usize;
        
        let mut buffer = vec![0u8; actual_chunk_size];
        file.read_exact(&mut buffer).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to read chunk data: {}", e),
            file_path: Some(self.file_path.display().to_string()),
            recoverable: false,
        })?;
        
        Ok(buffer)
    }
    
    /// Write a specific chunk to the file
    pub async fn write_chunk(&self, chunk_id: u32, data: Vec<u8>) -> Result<(), TransferError> {
        if chunk_id as usize >= self.total_chunks {
            return Err(TransferError::FileError {
                message: format!("Chunk ID {} exceeds total chunks {}", chunk_id, self.total_chunks),
                file_path: Some(self.file_path.display().to_string()),
                recoverable: false,
            });
        }
        
        let mut file = OpenOptions::new()
            .write(true)
            .open(&self.file_path)
            .await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to open file for writing: {}", e),
                file_path: Some(self.file_path.display().to_string()),
                recoverable: false,
            })?;
        
        let offset = (chunk_id as u64) * (self.chunk_size as u64);
        file.seek(SeekFrom::Start(offset)).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to seek to chunk position: {}", e),
            file_path: Some(self.file_path.display().to_string()),
            recoverable: false,
        })?;
        
        file.write_all(&data).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to write chunk data: {}", e),
            file_path: Some(self.file_path.display().to_string()),
            recoverable: false,
        })?;
        
        file.flush().await.map_err(|e| TransferError::FileError {
            message: format!("Failed to flush chunk data: {}", e),
            file_path: Some(self.file_path.display().to_string()),
            recoverable: false,
        })?;
        
        Ok(())
    }
    
    /// Get the total number of chunks
    pub fn total_chunks(&self) -> usize {
        self.total_chunks
    }
    
    /// Get the chunk size
    pub fn chunk_size(&self) -> usize {
        self.chunk_size
    }
    
    /// Get the file size
    pub fn file_size(&self) -> u64 {
        self.file_size
    }
    
    /// Calculate the size of a specific chunk
    pub fn chunk_actual_size(&self, chunk_id: u32) -> usize {
        if chunk_id as usize >= self.total_chunks {
            return 0;
        }
        
        let offset = (chunk_id as u64) * (self.chunk_size as u64);
        let remaining_bytes = self.file_size - offset;
        std::cmp::min(self.chunk_size as u64, remaining_bytes) as usize
    }
}

/// File integrity verification utilities
pub struct FileIntegrityVerifier;

impl FileIntegrityVerifier {
    /// Verify file integrity by comparing source and destination checksums
    pub async fn verify_transfer_integrity(
        source_path: &Path,
        destination_path: &Path,
    ) -> Result<bool, TransferError> {
        let source_checksum = crate::crypto::ChecksumCalculator::calculate_file_sha256_async(source_path).await?;
        let dest_checksum = crate::crypto::ChecksumCalculator::calculate_file_sha256_async(destination_path).await?;
        
        Ok(crate::crypto::ChecksumCalculator::verify_integrity(&source_checksum, &dest_checksum))
    }
    
    /// Verify file integrity against a known checksum
    pub async fn verify_against_checksum(
        file_path: &Path,
        expected_checksum: &str,
    ) -> Result<bool, TransferError> {
        let actual_checksum = crate::crypto::ChecksumCalculator::calculate_file_sha256_async(file_path).await?;
        Ok(crate::crypto::ChecksumCalculator::verify_integrity(expected_checksum, &actual_checksum))
    }
    
    /// Calculate and compare checksums for multiple chunks
    pub async fn verify_chunked_integrity(
        chunks: &[(u32, Vec<u8>)],
        expected_checksums: &[(u32, String)],
    ) -> Result<bool, TransferError> {
        if chunks.len() != expected_checksums.len() {
            return Ok(false);
        }
        
        for ((chunk_id, data), (expected_id, expected_checksum)) in chunks.iter().zip(expected_checksums.iter()) {
            if chunk_id != expected_id {
                return Ok(false);
            }
            
            let actual_checksum = crate::crypto::ChecksumCalculator::calculate_data_sha256(data);
            if !crate::crypto::ChecksumCalculator::verify_integrity(expected_checksum, &actual_checksum) {
                return Ok(false);
            }
        }
        
        Ok(true)
    }
}

#[cfg(test)]
mod tests;

// Protocol messages
#[derive(Serialize, Deserialize)]
pub enum ProtocolMessage {
    Handshake { filename: String, size: u64, checksum: String },
    HandshakeAck { accepted: bool, reason: Option<String> },
    DataChunk { sequence: u32, data: Vec<u8> },
    DataAck { sequence: u32, status: AckStatus },
    TransferComplete { checksum: String },
    Error { code: String, message: String },
}

#[derive(Serialize, Deserialize)]
pub enum AckStatus {
    Ok,
    Retry,
    Error,
}



