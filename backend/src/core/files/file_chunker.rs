use crate::errors::TransferError;
use std::path::PathBuf;
use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, SeekFrom};

/// File chunking functionality for efficient transfer of large files
pub struct FileChunker {
    file_path: PathBuf,
    chunk_size: usize,
    total_chunks: usize,
    file_size: u64,
    current_chunk: u32,
}

impl FileChunker {
    /// Create a new file chunker (legacy method for compatibility)
    pub fn new(file_path: PathBuf, chunk_size: usize) -> Result<Self, TransferError> {
        // For compatibility, we'll create a basic chunker without async file operations
        // The actual file operations will be done in the async methods
        Ok(Self {
            file_path,
            chunk_size,
            total_chunks: 0, // Will be calculated when needed
            file_size: 0,    // Will be set when needed
            current_chunk: 0,
        })
    }

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
            current_chunk: 0,
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
            current_chunk: 0,
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

    /// Read the next chunk sequentially (for compatibility)
    pub async fn read_next_chunk(&mut self) -> Result<Option<Vec<u8>>, TransferError> {
        // Initialize file size if not set
        if self.file_size == 0 {
            let metadata = tokio::fs::metadata(&self.file_path).await.map_err(|e| TransferError::FileError {
                message: format!("Failed to read file metadata: {}", e),
                file_path: Some(self.file_path.display().to_string()),
                recoverable: false,
            })?;
            self.file_size = metadata.len();
            self.total_chunks = ((self.file_size as f64) / (self.chunk_size as f64)).ceil() as usize;
        }

        if self.current_chunk as usize >= self.total_chunks {
            return Ok(None);
        }
        
        let chunk = self.read_chunk(self.current_chunk).await?;
        self.current_chunk += 1;
        Ok(Some(chunk))
    }
}