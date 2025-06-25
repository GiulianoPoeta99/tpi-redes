// File transfer logic module
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub progress: f64,        // 0.0 - 1.0
    pub speed: f64,           // bytes per second
    pub eta: u64,             // seconds remaining
    pub status: TransferStatus,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum TransferStatus {
    Idle,
    Connecting,
    Transferring,
    Completed,
    Error,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferResult {
    pub success: bool,
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: Duration,
    pub checksum: String,
    pub error: Option<String>,
}

// File chunking functionality
pub struct FileChunker {
    chunk_size: usize,
    total_chunks: usize,
}

impl FileChunker {
    pub fn new(file_size: u64, chunk_size: usize) -> Self {
        let total_chunks = ((file_size as f64) / (chunk_size as f64)).ceil() as usize;
        Self {
            chunk_size,
            total_chunks,
        }
    }
    
    pub async fn read_chunk(&mut self, chunk_id: u32) -> Result<Vec<u8>, crate::utils::errors::TransferError> {
        // Implementation will be added in task 4
        todo!("Implementation in task 4")
    }
    
    pub async fn write_chunk(&mut self, chunk_id: u32, data: Vec<u8>) -> Result<(), crate::utils::errors::TransferError> {
        // Implementation will be added in task 4
        todo!("Implementation in task 4")
    }
}

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