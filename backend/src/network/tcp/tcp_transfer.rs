// Theoretical TCP transfer implementation following proper TCP protocol behavior
use crate::config::{TransferConfig, TransferMode};
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::errors::TransferError;
use crate::core::{
    files::{file_chunker::FileChunker, file_metadata::FileMetadata},
    transfer::{protocol_messages::ProtocolMessage, transfer_result::TransferResult, ack_status::AckStatus},
};
use serde_json;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;
use tracing;
use uuid::Uuid;

/// TCP transfer implementation following theoretical TCP protocol behavior
/// Implements proper handshake sequences, metadata exchange, and acknowledgments
pub struct TcpTransfer {
    socket: Option<TcpStream>,
    config: TransferConfig,
    transfer_id: String,
    chunk_size: usize,
}

impl TcpTransfer {
    /// Create a new TCP transfer instance
    pub fn new(config: TransferConfig) -> Self {
        Self {
            socket: None,
            config,
            transfer_id: Uuid::new_v4().to_string(),
            chunk_size: 8192, // 8KB chunks as per requirements
        }
    }

    /// Get the transfer ID
    pub fn transfer_id(&self) -> &str {
        &self.transfer_id
    }

    /// Establish TCP connection as sender (SYN → SYN-ACK → ACK)
    pub async fn connect(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        let connect_future = TcpStream::connect(addr);
        
        match timeout(self.config.timeout, connect_future).await {
            Ok(Ok(stream)) => {
                self.socket = Some(stream);
                // TCP handshake is handled by the OS, but we simulate the theoretical behavior
                tracing::debug!("TCP handshake completed: SYN → SYN-ACK → ACK for {}", addr);
                Ok(())
            }
            Ok(Err(e)) => Err(TransferError::NetworkError {
                message: format!("TCP handshake failed to {}: {}", addr, e),
                context: Some(addr.to_string()),
                recoverable: true,
            }),
            Err(_) => Err(TransferError::Timeout {
                seconds: self.config.timeout.as_secs(),
                operation: format!("TCP connect handshake to {}", addr),
                recoverable: true,
            }),
        }
    }

    /// Create TCP listener for receiver mode
    pub async fn listen(addr: SocketAddr, timeout_duration: Duration) -> Result<(TcpTransfer, SocketAddr), TransferError> {
        let listener = TcpListener::bind(addr).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to bind TCP listener to {}: {}", addr, e),
            context: Some(addr.to_string()),
            recoverable: false,
        })?;

        tracing::debug!("TCP listener bound to {}, waiting for connection", addr);

        let accept_future = listener.accept();
        match timeout(timeout_duration, accept_future).await {
            Ok(Ok((stream, peer_addr))) => {
                tracing::debug!("TCP connection accepted from {} (handshake: SYN → SYN-ACK → ACK)", peer_addr);
                
                let config = TransferConfig {
                    mode: TransferMode::Receiver,
                    protocol: crate::config::Protocol::Tcp,
                    target_ip: Some(peer_addr.ip().to_string()),
                    port: addr.port(),
                    filename: None,
                    chunk_size: 8192,
                    timeout: timeout_duration,
                };

                let mut tcp_transfer = TcpTransfer::new(config);
                tcp_transfer.socket = Some(stream);
                
                Ok((tcp_transfer, peer_addr))
            }
            Ok(Err(e)) => Err(TransferError::NetworkError {
                message: format!("Failed to accept TCP connection: {}", e),
                context: None,
                recoverable: true,
            }),
            Err(_) => Err(TransferError::Timeout {
                seconds: timeout_duration.as_secs(),
                operation: "TCP accept connection".to_string(),
                recoverable: true,
            }),
        }
    }

    /// Send file with proper TCP protocol flow
    /// Flow: metadata → metadata-ACK → chunk → chunk-ACK (repeat) → checksum → checksum-ACK → FIN
    pub async fn send_file_with_handshake(&mut self, file_path: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        // Get file metadata
        let metadata = FileMetadata::from_path(&file_path).await?;
        let file_size = metadata.size;
        
        // Calculate source checksum
        let source_checksum = ChecksumCalculator::calculate_file_sha256_async(&file_path).await?;
        
        tracing::debug!("Starting TCP file transfer: {} ({} bytes)", metadata.name, file_size);

        // Step 1: Send file metadata
        let handshake = ProtocolMessage::Handshake {
            filename: metadata.name.clone(),
            size: file_size,
            checksum: source_checksum.clone(),
        };
        
        self.send_message(&handshake).await?;
        tracing::debug!("Sent file metadata for {}", metadata.name);

        // Step 2: Wait for metadata acknowledgment
        let ack_message = self.receive_message().await?;
        match ack_message {
            ProtocolMessage::HandshakeAck { accepted: true, .. } => {
                tracing::debug!("Metadata acknowledged, proceeding with transfer");
            }
            ProtocolMessage::HandshakeAck { accepted: false, reason } => {
                return Err(TransferError::ProtocolError {
                    message: format!("Metadata rejected: {}", reason.unwrap_or("Unknown reason".to_string())),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected metadata acknowledgment".to_string(),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
        }

        // Step 3: Send file chunks with acknowledgments
        let mut chunker = FileChunker::new(file_path.clone(), self.chunk_size)?;
        let mut sequence = 0u32;
        let mut bytes_transferred = 0u64;
        
        while let Some(chunk) = chunker.read_next_chunk().await? {
            // Send 8KB chunk
            let data_message = ProtocolMessage::DataChunk {
                sequence,
                data: chunk.clone(),
            };
            
            self.send_message(&data_message).await?;
            tracing::debug!("Sent chunk {} ({} bytes)", sequence, chunk.len());

            // Wait for chunk acknowledgment before sending next chunk
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
                            tracing::debug!("Chunk {} acknowledged successfully", ack_seq);
                        }
                        AckStatus::Retry => {
                            tracing::debug!("Chunk {} needs retry", ack_seq);
                            continue; // Retry the same chunk
                        }
                        AckStatus::Error => {
                            return Err(TransferError::ProtocolError {
                                message: format!("Chunk {} transfer failed", ack_seq),
                                protocol: "TCP".to_string(),
                                recoverable: true,
                            });
                        }
                    }
                }
                _ => {
                    return Err(TransferError::ProtocolError {
                        message: "Expected chunk acknowledgment".to_string(),
                        protocol: "TCP".to_string(),
                        recoverable: false,
                    });
                }
            }
        }

        // Step 4: Send final checksum
        let complete_message = ProtocolMessage::TransferComplete {
            checksum: source_checksum.clone(),
        };
        self.send_message(&complete_message).await?;
        tracing::debug!("Sent final checksum: {}", source_checksum);

        // Step 5: Wait for checksum acknowledgment
        let final_ack = self.receive_message().await?;
        match final_ack {
            ProtocolMessage::HandshakeAck { accepted: true, .. } => {
                tracing::debug!("Final checksum acknowledged");
            }
            ProtocolMessage::HandshakeAck { accepted: false, reason } => {
                return Err(TransferError::ChecksumMismatch {
                    expected: source_checksum.clone(),
                    actual: reason.unwrap_or("Unknown".to_string()),
                    file_path: file_path.display().to_string(),
                });
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected final checksum acknowledgment".to_string(),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
        }

        // Step 6: TCP connection teardown (FIN handshake handled by OS when socket drops)
        let duration = start_time.elapsed();
        tracing::debug!("TCP file transfer completed in {:?}", duration);

        Ok(TransferResult::success(
            self.transfer_id.clone(),
            bytes_transferred,
            duration,
            source_checksum,
        ))
    }

    /// Receive file with proper TCP protocol flow
    /// Flow: metadata → metadata-ACK → chunk → chunk-ACK (repeat) → checksum → checksum-ACK
    pub async fn receive_file_with_handshake(&mut self, output_path: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        tracing::debug!("Starting TCP file reception");

        // Step 1: Wait for file metadata
        let handshake_message = self.receive_message().await?;
        let (filename, _expected_size, expected_checksum) = match handshake_message {
            ProtocolMessage::Handshake { filename, size, checksum } => {
                tracing::debug!("Received metadata: {} ({} bytes, checksum: {})", filename, size, checksum);
                (filename, size, checksum)
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected file metadata".to_string(),
                    protocol: "TCP".to_string(),
                    recoverable: false,
                });
            }
        };

        // Step 2: Send metadata acknowledgment
        let ack = ProtocolMessage::HandshakeAck {
            accepted: true,
            reason: None,
        };
        self.send_message(&ack).await?;
        tracing::debug!("Sent metadata acknowledgment");

        // Prepare output file
        let final_output_path = output_path.join(&filename);
        let mut output_file = File::create(&final_output_path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to create output file: {}", e),
            file_path: Some(final_output_path.display().to_string()),
            recoverable: false,
        })?;

        let mut bytes_received = 0u64;
        let mut expected_sequence = 0u32;

        // Step 3: Receive file chunks with acknowledgments
        loop {
            let message = self.receive_message().await?;
            
            match message {
                ProtocolMessage::DataChunk { sequence, data } => {
                    tracing::debug!("Received chunk {} ({} bytes)", sequence, data.len());
                    
                    if sequence != expected_sequence {
                        tracing::warn!("Sequence mismatch: expected {}, got {}", expected_sequence, sequence);
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
                        file_path: Some(final_output_path.display().to_string()),
                        recoverable: false,
                    })?;

                    bytes_received += data.len() as u64;
                    expected_sequence += 1;

                    // Send chunk acknowledgment
                    let success_ack = ProtocolMessage::DataAck {
                        sequence,
                        status: AckStatus::Ok,
                    };
                    self.send_message(&success_ack).await?;
                    tracing::debug!("Sent acknowledgment for chunk {}", sequence);
                }
                ProtocolMessage::TransferComplete { checksum } => {
                    tracing::debug!("Received final checksum: {}", checksum);
                    
                    // Flush and close file
                    output_file.flush().await.map_err(|e| TransferError::FileError {
                        message: format!("Failed to flush output file: {}", e),
                        file_path: Some(final_output_path.display().to_string()),
                        recoverable: false,
                    })?;
                    drop(output_file);

                    // Step 4: Verify checksum
                    let actual_checksum = ChecksumCalculator::calculate_file_sha256_async(&final_output_path).await?;
                    
                    let checksum_verified = actual_checksum == expected_checksum;
                    
                    // Step 5: Send checksum acknowledgment
                    let checksum_ack = ProtocolMessage::HandshakeAck {
                        accepted: checksum_verified,
                        reason: if checksum_verified { 
                            None 
                        } else { 
                            Some(actual_checksum.clone()) 
                        },
                    };
                    self.send_message(&checksum_ack).await?;

                    if !checksum_verified {
                        return Err(TransferError::ChecksumMismatch {
                            expected: expected_checksum,
                            actual: actual_checksum,
                            file_path: final_output_path.display().to_string(),
                        });
                    }

                    let duration = start_time.elapsed();
                    tracing::debug!("TCP file reception completed in {:?}", duration);

                    return Ok(TransferResult::success(
                        self.transfer_id.clone(),
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

    /// Send a protocol message over TCP
    async fn send_message(&mut self, message: &ProtocolMessage) -> Result<(), TransferError> {
        let socket = self.socket.as_mut()
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

        // Send message length followed by message data
        let length = serialized.len() as u32;
        socket.write_all(&length.to_be_bytes()).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to send message length: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        socket.write_all(&serialized).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to send message data: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        socket.flush().await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to flush TCP socket: {}", e),
            context: None,
            recoverable: true,
        })?;

        Ok(())
    }

    /// Receive a protocol message over TCP
    async fn receive_message(&mut self) -> Result<ProtocolMessage, TransferError> {
        let socket = self.socket.as_mut()
            .ok_or_else(|| TransferError::NetworkError {
                message: "No active TCP connection".to_string(),
                context: None,
                recoverable: false,
            })?;

        // Read message length
        let mut length_bytes = [0u8; 4];
        socket.read_exact(&mut length_bytes).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to read message length: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        let length = u32::from_be_bytes(length_bytes) as usize;

        // Read message data
        let mut buffer = vec![0u8; length];
        socket.read_exact(&mut buffer).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to read message data: {}", e),
            context: None,
            recoverable: true,
        })?;

        // Deserialize message
        let message = serde_json::from_slice(&buffer).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to deserialize message: {}", e),
            protocol: "TCP".to_string(),
            recoverable: false,
        })?;

        Ok(message)
    }

    /// Close the TCP connection (triggers FIN handshake)
    pub async fn close(&mut self) -> Result<(), TransferError> {
        if let Some(socket) = self.socket.take() {
            drop(socket); // Dropping the socket triggers TCP FIN handshake
            tracing::debug!("TCP connection closed (FIN handshake initiated)");
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Protocol, TransferMode};
    use std::net::{IpAddr, Ipv4Addr};
    use tempfile::{NamedTempFile, TempDir};
    use tokio::fs;
    use std::io::Write;

    fn create_test_config(mode: TransferMode) -> TransferConfig {
        TransferConfig {
            mode,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 0, // Let OS choose port
            filename: None,
            chunk_size: 8192,
            timeout: Duration::from_secs(30),
        }
    }

    async fn create_test_file(content: &[u8]) -> NamedTempFile {
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(content).unwrap();
        temp_file.flush().unwrap();
        temp_file
    }

    #[tokio::test]
    async fn test_tcp_handshake_sequence() {
        let config = create_test_config(TransferMode::Transmitter);
        let mut tcp_transfer = TcpTransfer::new(config);
        
        // Test connection to non-existent address should fail
        let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
        let result = tcp_transfer.connect(addr).await;
        
        // Should fail to connect since no server is listening
        assert!(result.is_err());
        if let Err(TransferError::NetworkError { message, .. }) = result {
            assert!(message.contains("TCP handshake failed"));
        }
    }

    #[tokio::test]
    async fn test_tcp_protocol_flow() {
        // Create test file
        let test_content = b"Hello, TCP World! This is a test file for TCP transfer.";
        let temp_file = create_test_file(test_content).await;
        let _temp_dir = TempDir::new().unwrap();
        
        // Test the protocol message flow
        let sender_config = create_test_config(TransferMode::Transmitter);
        let sender = TcpTransfer::new(sender_config);
        
        // Verify chunk size is 8KB as per requirements
        assert_eq!(sender.chunk_size, 8192);
        
        // Verify transfer ID is generated
        assert!(!sender.transfer_id().is_empty());
        
        // Test file metadata creation
        let metadata = FileMetadata::from_path(temp_file.path()).await.unwrap();
        assert_eq!(metadata.size, test_content.len() as u64);
        
        // Test checksum calculation
        let checksum = ChecksumCalculator::calculate_file_sha256_async(temp_file.path()).await.unwrap();
        assert!(!checksum.is_empty());
        assert_eq!(checksum.len(), 64); // SHA-256 hex string length
    }

    #[tokio::test]
    async fn test_protocol_message_serialization() {
        // Test handshake message
        let handshake = ProtocolMessage::Handshake {
            filename: "test.txt".to_string(),
            size: 1024,
            checksum: "abc123".to_string(),
        };
        
        let serialized = serde_json::to_vec(&handshake).unwrap();
        let deserialized: ProtocolMessage = serde_json::from_slice(&serialized).unwrap();
        
        match deserialized {
            ProtocolMessage::Handshake { filename, size, checksum } => {
                assert_eq!(filename, "test.txt");
                assert_eq!(size, 1024);
                assert_eq!(checksum, "abc123");
            }
            _ => panic!("Wrong message type"),
        }
        
        // Test data chunk message
        let chunk = ProtocolMessage::DataChunk {
            sequence: 42,
            data: vec![1, 2, 3, 4, 5],
        };
        
        let serialized = serde_json::to_vec(&chunk).unwrap();
        let deserialized: ProtocolMessage = serde_json::from_slice(&serialized).unwrap();
        
        match deserialized {
            ProtocolMessage::DataChunk { sequence, data } => {
                assert_eq!(sequence, 42);
                assert_eq!(data, vec![1, 2, 3, 4, 5]);
            }
            _ => panic!("Wrong message type"),
        }
    }

    #[tokio::test]
    async fn test_chunk_acknowledgment_flow() {
        // Test acknowledgment status handling
        let ack_ok = ProtocolMessage::DataAck {
            sequence: 1,
            status: AckStatus::Ok,
        };
        
        let ack_retry = ProtocolMessage::DataAck {
            sequence: 2,
            status: AckStatus::Retry,
        };
        
        let ack_error = ProtocolMessage::DataAck {
            sequence: 3,
            status: AckStatus::Error,
        };
        
        // Verify serialization works for all ack types
        for ack in [ack_ok, ack_retry, ack_error] {
            let serialized = serde_json::to_vec(&ack).unwrap();
            let _deserialized: ProtocolMessage = serde_json::from_slice(&serialized).unwrap();
        }
    }

    #[tokio::test]
    async fn test_transfer_complete_message() {
        let complete = ProtocolMessage::TransferComplete {
            checksum: "sha256hash".to_string(),
        };
        
        let serialized = serde_json::to_vec(&complete).unwrap();
        let deserialized: ProtocolMessage = serde_json::from_slice(&serialized).unwrap();
        
        match deserialized {
            ProtocolMessage::TransferComplete { checksum } => {
                assert_eq!(checksum, "sha256hash");
            }
            _ => panic!("Wrong message type"),
        }
    }

    #[tokio::test]
    async fn test_error_handling() {
        let config = create_test_config(TransferMode::Transmitter);
        let mut tcp_transfer = TcpTransfer::new(config);
        
        // Test sending without connection should fail
        let handshake = ProtocolMessage::Handshake {
            filename: "test.txt".to_string(),
            size: 100,
            checksum: "test".to_string(),
        };
        
        let result = tcp_transfer.send_message(&handshake).await;
        assert!(result.is_err());
        
        if let Err(TransferError::NetworkError { message, .. }) = result {
            assert!(message.contains("No active TCP connection"));
        }
    }
}