// TCP file sending functionality
use crate::config::TransferConfig;
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::errors::TransferError;
use crate::network::tcp::TcpConnection;
use crate::core::{
    files::{file_chunker::FileChunker, file_metadata::FileMetadata},
    transfer::{protocol_messages::ProtocolMessage, transfer_result::TransferResult, ack_status::AckStatus},
};
use serde_json;
use std::path::PathBuf;
use std::time::Instant;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub struct TcpFileSender {
    connection: TcpConnection,
}

impl TcpFileSender {
    pub fn new(config: TransferConfig) -> Self {
        Self {
            connection: TcpConnection::new(config),
        }
    }

    pub fn from_connection(connection: TcpConnection) -> Self {
        Self { connection }
    }
    
    pub fn get_connection_mut(&mut self) -> &mut TcpConnection {
        &mut self.connection
    }

    pub fn get_connection(&self) -> &TcpConnection {
        &self.connection
    }
    
    /// Send a file over TCP
    pub async fn send_file(&mut self, file_path: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        // Get file metadata
        let metadata = FileMetadata::from_path(&file_path).await?;
        let file_size = metadata.size;
        
        // Calculate checksum
        let source_checksum = ChecksumCalculator::calculate_file_sha256_async(&file_path).await?;
        
        // Send handshake
        let handshake = ProtocolMessage::Handshake {
            filename: metadata.name.clone(),
            size: file_size,
            checksum: source_checksum.clone(),
        };
        
        self.send_message(&handshake).await?;
        
        // Wait for handshake acknowledgment
        let ack_message = self.receive_message().await?;
        match ack_message {
            ProtocolMessage::HandshakeAck { accepted: true, .. } => {
                // Proceed with transfer
            }
            ProtocolMessage::HandshakeAck { accepted: false, reason } => {
                return Err(TransferError::ProtocolError {
                    message: format!("Handshake rejected: {}", reason.unwrap_or("Unknown reason".to_string())),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected handshake acknowledgment".to_string(),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
        }
        
        // Send file chunks
        let mut chunker = FileChunker::new(file_path.clone(), 8192)?;
        let mut sequence = 0u32;
        let mut bytes_transferred = 0u64;
        
        while let Some(chunk) = chunker.read_next_chunk().await? {
            let data_message = ProtocolMessage::DataChunk {
                sequence,
                data: chunk.clone(),
            };
            
            self.send_message(&data_message).await?;
            
            // Wait for acknowledgment
            let ack = self.receive_message().await?;
            match ack {
                ProtocolMessage::DataAck { sequence: ack_seq, status } => {
                    if ack_seq != sequence {
                        return Err(TransferError::ProtocolError {
                            message: format!("Sequence mismatch: expected {}, got {}", sequence, ack_seq),
                            protocol: "TCP".to_string(),
                            recoverable: false,
                        });
                    }
                    
                    match status {
                        AckStatus::Ok => {
                            bytes_transferred += chunk.len() as u64;
                            sequence += 1;
                        }
                        AckStatus::Retry => {
                            // Retry the same chunk
                            continue;
                        }
                        AckStatus::Error => {
                            return Err(TransferError::ProtocolError {
                                message: "Chunk transfer failed".to_string(),
                                protocol: "TCP".to_string(),
                                recoverable: true,
                            });
                        }
                    }
                }
                _ => {
                    return Err(TransferError::ProtocolError {
                        message: "Expected data acknowledgment".to_string(),
                        protocol: "TCP".to_string(),
                        recoverable: false,
                    });
                }
            }
        }
        
        // Send transfer complete message
        let complete_message = ProtocolMessage::TransferComplete {
            checksum: source_checksum.clone(),
        };
        self.send_message(&complete_message).await?;
        
        let duration = start_time.elapsed();
        
        Ok(TransferResult::success(
            self.connection.transfer_id().to_string(),
            bytes_transferred,
            duration,
            source_checksum,
        ))
    }
    
    async fn send_message(&mut self, message: &ProtocolMessage) -> Result<(), TransferError> {
        let socket = self.connection.get_socket()
            .ok_or_else(|| TransferError::NetworkError {
                message: "No active TCP connection".to_string(),
                context: None,
                recoverable: false,
            })?;
        
        let serialized = serde_json::to_vec(message).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to serialize message: {}", e),
            protocol: "TCP".to_string(),
            recoverable: false,
        })?;
        
        let length = serialized.len() as u32;
        socket.write_all(&length.to_be_bytes()).await?;
        socket.write_all(&serialized).await?;
        socket.flush().await?;
        
        Ok(())
    }
    
    async fn receive_message(&mut self) -> Result<ProtocolMessage, TransferError> {
        let socket = self.connection.get_socket()
            .ok_or_else(|| TransferError::NetworkError {
                message: "No active TCP connection".to_string(),
                context: None,
                recoverable: false,
            })?;
        
        let mut length_bytes = [0u8; 4];
        socket.read_exact(&mut length_bytes).await?;
        let length = u32::from_be_bytes(length_bytes) as usize;
        
        let mut buffer = vec![0u8; length];
        socket.read_exact(&mut buffer).await?;
        
        let message = serde_json::from_slice(&buffer).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to deserialize message: {}", e),
            protocol: "TCP".to_string(),
            recoverable: false,
        })?;
        
        Ok(message)
    }
}