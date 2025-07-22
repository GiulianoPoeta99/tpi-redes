// TCP file receiving functionality
use crate::config::TransferConfig;
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::errors::TransferError;
use crate::network::tcp::TcpConnection;
use crate::core::{
    // files::file_chunker::FileChunker,
    transfer::{protocol_messages::ProtocolMessage, transfer_result::TransferResult, ack_status::AckStatus},
};
use serde_json;
use std::path::PathBuf;
use std::time::Instant;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub struct TcpFileReceiver {
    connection: TcpConnection,
}

impl TcpFileReceiver {
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
    
    /// Receive a file over TCP
    pub async fn receive_file(&mut self, output_dir: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        // Wait for handshake
        let handshake_message = self.receive_message().await?;
        let (filename, _expected_size, expected_checksum) = match handshake_message {
            ProtocolMessage::Handshake { filename, size, checksum } => {
                (filename, size, checksum)
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected handshake message".to_string(),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
        };
        
        // Send handshake acknowledgment
        let ack = ProtocolMessage::HandshakeAck {
            accepted: true,
            reason: None,
        };
        self.send_message(&ack).await?;
        
        // Prepare output file
        let output_path = output_dir.join(&filename);
        let mut output_file = File::create(&output_path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to create output file: {}", e),
            file_path: Some(output_path.display().to_string()),
            recoverable: false,
        })?;
        
        let mut bytes_received = 0u64;
        let mut expected_sequence = 0u32;
        
        // Receive file chunks
        loop {
            let message = self.receive_message().await?;
            
            match message {
                ProtocolMessage::DataChunk { sequence, data } => {
                    if sequence != expected_sequence {
                        let error_ack = ProtocolMessage::DataAck {
                            sequence,
                            status: AckStatus::Error,
                        };
                        self.send_message(&error_ack).await?;
                        continue;
                    }
                    
                    // Write chunk to file
                    output_file.write_all(&data).await.map_err(|e| TransferError::FileError {
                        message: format!("Failed to write to output file: {}", e),
                        file_path: Some(output_path.display().to_string()),
                        recoverable: false,
                    })?;
                    
                    bytes_received += data.len() as u64;
                    expected_sequence += 1;
                    
                    // Send acknowledgment
                    let success_ack = ProtocolMessage::DataAck {
                        sequence,
                        status: AckStatus::Ok,
                    };
                    self.send_message(&success_ack).await?;
                }
                ProtocolMessage::TransferComplete { checksum: _ } => {
                    // Flush and close file
                    output_file.flush().await.map_err(|e| TransferError::FileError {
                        message: format!("Failed to flush output file: {}", e),
                        file_path: Some(output_path.display().to_string()),
                        recoverable: false,
                    })?;
                    drop(output_file);
                    
                    // Verify checksum
                    let actual_checksum = ChecksumCalculator::calculate_file_sha256_async(&output_path).await?;
                    
                    if actual_checksum != expected_checksum {
                        return Err(TransferError::ChecksumMismatch {
                            expected: expected_checksum,
                            actual: actual_checksum,
                            file_path: output_path.display().to_string(),
                        });
                    }
                    
                    let duration = start_time.elapsed();
                    
                    return Ok(TransferResult::success(
                        self.connection.transfer_id().to_string(),
                        bytes_received,
                        duration,
                        actual_checksum,
                    ));
                }
                ProtocolMessage::Error { code, message } => {
                    return Err(TransferError::ProtocolError {
                        message: format!("Remote error {}: {}", code, message),
                        protocol: "TCP".to_string(),
                        recoverable: false,
                    });
                }
                _ => {
                    return Err(TransferError::ProtocolError {
                        message: "Unexpected message during file transfer".to_string(),
                        protocol: "TCP".to_string(),
                        recoverable: false,
                    });
                }
            }
        }
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