// TCP socket implementation
use crate::config::TransferConfig;
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::transfer::{
    file_chunker::FileChunker,
    file_metadata::FileMetadata,
    protocol_messages::ProtocolMessage,
    transfer_result::TransferResult,
    ack_status::AckStatus,
};
use crate::utils::errors::TransferError;
use serde_json;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;
use uuid::Uuid;

pub struct TcpTransfer {
    socket: Option<TcpStream>,
    config: TransferConfig,
    transfer_id: String,
}

impl TcpTransfer {
    pub fn new(config: TransferConfig) -> Self {
        Self {
            socket: None,
            config,
            transfer_id: Uuid::new_v4().to_string(),
        }
    }
    
    /// Connect to a remote TCP server with timeout handling
    pub async fn connect(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        let connect_future = TcpStream::connect(addr);
        
        match timeout(self.config.timeout, connect_future).await {
            Ok(Ok(stream)) => {
                self.socket = Some(stream);
                Ok(())
            }
            Ok(Err(e)) => Err(TransferError::NetworkError {
                message: format!("Failed to connect to {}: {}", addr, e),
                context: Some(addr.to_string()),
                recoverable: true,
            }),
            Err(_) => Err(TransferError::Timeout {
                seconds: self.config.timeout.as_secs(),
                operation: "TCP connection".to_string(),
                recoverable: true,
            }),
        }
    }
    
    /// Start listening on a TCP port with connection acceptance
    pub async fn listen(addr: SocketAddr) -> Result<TcpListener, TransferError> {
        TcpListener::bind(addr).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to bind to {}: {}", addr, e),
            context: Some(addr.to_string()),
            recoverable: false,
        })
    }
    
    /// Accept an incoming connection with timeout
    pub async fn accept_connection(
        listener: &TcpListener,
        timeout_duration: Duration,
    ) -> Result<(TcpStream, SocketAddr), TransferError> {
        let accept_future = listener.accept();
        
        match timeout(timeout_duration, accept_future).await {
            Ok(Ok((stream, addr))) => Ok((stream, addr)),
            Ok(Err(e)) => Err(TransferError::NetworkError {
                message: format!("Failed to accept connection: {}", e),
                context: None,
                recoverable: true,
            }),
            Err(_) => Err(TransferError::Timeout {
                seconds: timeout_duration.as_secs(),
                operation: "TCP accept".to_string(),
                recoverable: true,
            }),
        }
    }
    
    /// Send a file to the connected peer
    pub async fn send_file(&mut self, file_path: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        // Ensure we have a connection
        let socket = self.socket.as_mut().ok_or_else(|| TransferError::NetworkError {
            message: "No active TCP connection".to_string(),
            context: None,
            recoverable: false,
        })?;
        
        // Get file metadata and calculate checksum
        let metadata = FileMetadata::from_path(&file_path).await?;
        let source_checksum = ChecksumCalculator::calculate_file_sha256_async(&file_path).await?;
        
        // Create file chunker
        let chunker = FileChunker::new_reader(file_path.clone(), self.config.chunk_size).await?;
        
        // Send handshake
        let handshake = ProtocolMessage::Handshake {
            filename: metadata.name.clone(),
            size: metadata.size,
            checksum: source_checksum.clone(),
        };
        
        Self::send_message(socket, &handshake).await?;
        
        // Wait for handshake acknowledgment
        let response = Self::receive_message(socket).await?;
        match response {
            ProtocolMessage::HandshakeAck { accepted: true, .. } => {
                // Proceed with transfer
            }
            ProtocolMessage::HandshakeAck { accepted: false, reason } => {
                return Err(TransferError::ProtocolError {
                    message: format!("Handshake rejected: {}", reason.unwrap_or_default()),
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
        let total_chunks = chunker.total_chunks();
        let mut bytes_transferred = 0u64;
        
        for chunk_id in 0..total_chunks {
            let chunk_data = chunker.read_chunk(chunk_id as u32).await?;
            bytes_transferred += chunk_data.len() as u64;
            
            let data_chunk = ProtocolMessage::DataChunk {
                sequence: chunk_id as u32,
                data: chunk_data,
            };
            
            // Send chunk with retry logic
            Self::send_chunk_with_retry(socket, &data_chunk, chunk_id as u32).await?;
        }
        
        // Send transfer complete message
        let complete_msg = ProtocolMessage::TransferComplete {
            checksum: source_checksum.clone(),
        };
        Self::send_message(socket, &complete_msg).await?;
        
        let duration = start_time.elapsed();
        
        Ok(TransferResult::success(
            self.transfer_id.clone(),
            bytes_transferred,
            duration,
            source_checksum,
        ))
    }
    
    /// Receive a file from the connected peer
    pub async fn receive_file(&mut self, output_path: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        // Ensure we have a connection
        let socket = self.socket.as_mut().ok_or_else(|| TransferError::NetworkError {
            message: "No active TCP connection".to_string(),
            context: None,
            recoverable: false,
        })?;
        
        // Wait for handshake
        let handshake = Self::receive_message(socket).await?;
        let (filename, file_size, expected_checksum) = match handshake {
            ProtocolMessage::Handshake { filename, size, checksum } => (filename, size, checksum),
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected handshake message".to_string(),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
        };
        
        // Create output file path
        let final_output_path = if output_path.is_dir() {
            output_path.join(&filename)
        } else {
            output_path
        };
        
        // Send handshake acknowledgment
        let ack = ProtocolMessage::HandshakeAck {
            accepted: true,
            reason: None,
        };
        Self::send_message(socket, &ack).await?;
        
        // Create file chunker for writing
        let chunker = FileChunker::new_writer(
            final_output_path.clone(),
            file_size,
            self.config.chunk_size,
        ).await?;
        
        let total_chunks = chunker.total_chunks();
        let mut received_chunks = vec![false; total_chunks];
        let mut bytes_transferred = 0u64;
        
        // Receive file chunks
        loop {
            let message = Self::receive_message(socket).await?;
            
            match message {
                ProtocolMessage::DataChunk { sequence, data } => {
                    if (sequence as usize) < total_chunks && !received_chunks[sequence as usize] {
                        chunker.write_chunk(sequence, data.clone()).await?;
                        received_chunks[sequence as usize] = true;
                        bytes_transferred += data.len() as u64;
                        
                        // Send acknowledgment
                        let ack = ProtocolMessage::DataAck {
                            sequence,
                            status: AckStatus::Ok,
                        };
                        Self::send_message(socket, &ack).await?;
                    } else {
                        // Send NACK for duplicate or invalid chunks
                        let nack = ProtocolMessage::DataAck {
                            sequence,
                            status: AckStatus::Retry,
                        };
                        Self::send_message(socket, &nack).await?;
                    }
                }
                ProtocolMessage::TransferComplete { checksum: _ } => {
                    // Verify all chunks received
                    if received_chunks.iter().all(|&received| received) {
                        // Calculate received file checksum
                        let actual_checksum = ChecksumCalculator::calculate_file_sha256_async(&final_output_path).await?;
                        
                        // Verify integrity
                        if ChecksumCalculator::verify_integrity(&expected_checksum, &actual_checksum) {
                            let duration = start_time.elapsed();
                            return Ok(TransferResult::success(
                                self.transfer_id.clone(),
                                bytes_transferred,
                                duration,
                                actual_checksum,
                            ));
                        } else {
                            return Err(TransferError::ChecksumMismatch {
                                expected: expected_checksum,
                                actual: actual_checksum,
                                file_path: final_output_path.display().to_string(),
                            });
                        }
                    } else {
                        return Err(TransferError::ProtocolError {
                            message: "Transfer completed but not all chunks received".to_string(),
                            protocol: "TCP".to_string(),
                            recoverable: false,
                        });
                    }
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
    
    /// Send a chunk with retry logic for reliability
    async fn send_chunk_with_retry(
        socket: &mut TcpStream,
        chunk: &ProtocolMessage,
        sequence: u32,
    ) -> Result<(), TransferError> {
        const MAX_RETRIES: u32 = 3;
        let mut retries = 0;
        
        loop {
            // Send the chunk
            Self::send_message(socket, chunk).await?;
            
            // Wait for acknowledgment with timeout
            let ack_future = Self::receive_message(socket);
            match timeout(Duration::from_secs(10), ack_future).await {
                Ok(Ok(ProtocolMessage::DataAck { sequence: ack_seq, status })) => {
                    if ack_seq == sequence {
                        match status {
                            AckStatus::Ok => return Ok(()),
                            AckStatus::Retry => {
                                retries += 1;
                                if retries >= MAX_RETRIES {
                                    return Err(TransferError::ProtocolError {
                                        message: format!("Chunk {} NACK'd {} times", sequence, MAX_RETRIES),
                                        protocol: "TCP".to_string(),
                                        recoverable: false,
                                    });
                                }
                                // Retry the chunk
                                continue;
                            }
                            AckStatus::Error => {
                                return Err(TransferError::ProtocolError {
                                    message: format!("Chunk {} received error status", sequence),
                                    protocol: "TCP".to_string(),
                                    recoverable: false,
                                });
                            }
                        }
                    }
                }
                Ok(Ok(_)) => {
                    return Err(TransferError::ProtocolError {
                        message: "Unexpected response to data chunk".to_string(),
                        protocol: "TCP".to_string(),
                        recoverable: false,
                    });
                }
                Ok(Err(e)) => return Err(e),
                Err(_) => {
                    retries += 1;
                    if retries >= MAX_RETRIES {
                        return Err(TransferError::Timeout {
                            seconds: 10,
                            operation: format!("ACK for chunk {}", sequence),
                            recoverable: true,
                        });
                    }
                    // Retry the chunk
                    continue;
                }
            }
        }
    }
    
    /// Send a protocol message over the TCP connection
    async fn send_message(
        socket: &mut TcpStream,
        message: &ProtocolMessage,
    ) -> Result<(), TransferError> {
        let serialized = serde_json::to_vec(message).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to serialize message: {}", e),
            protocol: "TCP".to_string(),
            recoverable: false,
        })?;
        
        // Send message length first (4 bytes, big-endian)
        let length = serialized.len() as u32;
        socket.write_all(&length.to_be_bytes()).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to send message length: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        // Send the message data
        socket.write_all(&serialized).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to send message data: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        socket.flush().await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to flush socket: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        Ok(())
    }
    
    /// Receive a protocol message from the TCP connection
    async fn receive_message(socket: &mut TcpStream) -> Result<ProtocolMessage, TransferError> {
        // Read message length first (4 bytes, big-endian)
        let mut length_bytes = [0u8; 4];
        socket.read_exact(&mut length_bytes).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to read message length: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        let length = u32::from_be_bytes(length_bytes) as usize;
        
        // Validate message length to prevent memory exhaustion
        if length > 10 * 1024 * 1024 {  // 10MB max message size
            return Err(TransferError::ProtocolError {
                message: format!("Message too large: {} bytes", length),
                protocol: "TCP".to_string(),
                recoverable: false,
            });
        }
        
        // Read the message data
        let mut buffer = vec![0u8; length];
        socket.read_exact(&mut buffer).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to read message data: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        // Deserialize the message
        serde_json::from_slice(&buffer).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to deserialize message: {}", e),
            protocol: "TCP".to_string(),
            recoverable: false,
        })
    }
    
    /// Attempt to reconnect with exponential backoff
    pub async fn reconnect(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        const MAX_RECONNECT_ATTEMPTS: u32 = 5;
        let mut attempt = 0;
        let mut delay = Duration::from_millis(100);
        
        while attempt < MAX_RECONNECT_ATTEMPTS {
            match self.connect(addr).await {
                Ok(()) => return Ok(()),
                Err(e) => {
                    attempt += 1;
                    if attempt >= MAX_RECONNECT_ATTEMPTS {
                        return Err(TransferError::NetworkError {
                            message: format!("Failed to reconnect after {} attempts: {}", MAX_RECONNECT_ATTEMPTS, e),
                            context: Some(addr.to_string()),
                            recoverable: false,
                        });
                    }
                    
                    // Exponential backoff
                    tokio::time::sleep(delay).await;
                    delay = std::cmp::min(delay * 2, Duration::from_secs(30));
                }
            }
        }
        
        Err(TransferError::NetworkError {
            message: "Reconnection failed".to_string(),
            context: Some(addr.to_string()),
            recoverable: false,
        })
    }
    
    /// Get the transfer ID
    pub fn transfer_id(&self) -> &str {
        &self.transfer_id
    }
    
    /// Check if the connection is active
    pub fn is_connected(&self) -> bool {
        self.socket.is_some()
    }
    
    /// Close the connection
    pub async fn close(&mut self) -> Result<(), TransferError> {
        if let Some(mut socket) = self.socket.take() {
            socket.shutdown().await.map_err(|e| TransferError::NetworkError {
                message: format!("Failed to close connection: {}", e),
                context: None,
                recoverable: false,
            })?;
        }
        Ok(())
    }
    
    /// Set the socket (for testing purposes)
    #[cfg(test)]
    pub fn set_socket(&mut self, socket: TcpStream) {
        self.socket = Some(socket);
    }
}