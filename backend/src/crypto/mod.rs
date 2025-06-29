// Cryptography and checksum module
use crate::utils::errors::TransferError;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use tokio::fs::File as AsyncFile;
use tokio::io::{AsyncRead, AsyncReadExt, BufReader as AsyncBufReader};

pub struct ChecksumCalculator;

impl ChecksumCalculator {
    /// Calculate SHA-256 checksum of a file synchronously
    pub fn calculate_file_sha256(path: &Path) -> Result<String, TransferError> {
        let file = File::open(path).map_err(|e| TransferError::FileError {
            message: format!("Failed to open file {}: {}", path.display(), e),
            file_path: Some(path.display().to_string()),
            recoverable: false,
        })?;
        
        let mut reader = BufReader::new(file);
        Self::calculate_stream_sha256(reader)
    }
    
    /// Calculate SHA-256 checksum of a file asynchronously with streaming
    pub async fn calculate_file_sha256_async(path: &Path) -> Result<String, TransferError> {
        let file = AsyncFile::open(path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to open file {}: {}", path.display(), e),
            file_path: Some(path.display().to_string()),
            recoverable: false,
        })?;
        
        let mut reader = AsyncBufReader::new(file);
        Self::calculate_stream_sha256_async(reader).await
    }
    
    /// Calculate SHA-256 checksum from a stream synchronously
    pub fn calculate_stream_sha256(mut reader: impl Read) -> Result<String, TransferError> {
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192]; // 8KB buffer for efficient reading
        
        loop {
            let bytes_read = reader.read(&mut buffer).map_err(|e| TransferError::FileError {
                message: format!("Failed to read from stream: {}", e),
                file_path: None,
                recoverable: false,
            })?;
            
            if bytes_read == 0 {
                break;
            }
            
            hasher.update(&buffer[..bytes_read]);
        }
        
        Ok(format!("{:x}", hasher.finalize()))
    }
    
    /// Calculate SHA-256 checksum from an async stream
    pub async fn calculate_stream_sha256_async(mut reader: impl AsyncRead + Unpin) -> Result<String, TransferError> {
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192]; // 8KB buffer for efficient reading
        
        loop {
            let bytes_read = reader.read(&mut buffer).await.map_err(|e| TransferError::FileError {
                message: format!("Failed to read from async stream: {}", e),
                file_path: None,
                recoverable: false,
            })?;
            
            if bytes_read == 0 {
                break;
            }
            
            hasher.update(&buffer[..bytes_read]);
        }
        
        Ok(format!("{:x}", hasher.finalize()))
    }
    
    /// Verify file integrity by comparing checksums
    pub fn verify_integrity(expected: &str, actual: &str) -> bool {
        expected.to_lowercase() == actual.to_lowercase()
    }
    
    /// Calculate SHA-256 checksum of raw data
    pub fn calculate_data_sha256(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }
    
    /// Calculate SHA-256 checksum of a chunk with progress callback
    pub async fn calculate_chunk_sha256_with_progress<F>(
        data: &[u8],
        mut progress_callback: F,
    ) -> String 
    where
        F: FnMut(usize, usize),
    {
        let mut hasher = Sha256::new();
        let chunk_size = 1024; // Process in 1KB chunks for progress updates
        let total_size = data.len();
        
        for (i, chunk) in data.chunks(chunk_size).enumerate() {
            hasher.update(chunk);
            let processed = std::cmp::min((i + 1) * chunk_size, total_size);
            progress_callback(processed, total_size);
            
            // Yield control to allow other tasks to run
            tokio::task::yield_now().await;
        }
        
        format!("{:x}", hasher.finalize())
    }
}

#[cfg(test)]
mod tests;