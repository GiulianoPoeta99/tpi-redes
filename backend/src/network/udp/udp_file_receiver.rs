// UDP file receiving functionality
use crate::config::TransferConfig;
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::errors::TransferError;
use crate::network::udp::UdpConnection;
use crate::core::transfer::{
    transfer_progress::TransferProgress,
    transfer_result::TransferResult,
};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;
use tokio::time::timeout;

pub struct UdpFileReceiver {
    connection: UdpConnection,
    progress_sender: Option<mpsc::UnboundedSender<TransferProgress>>,
}

impl UdpFileReceiver {
    pub fn new(config: TransferConfig) -> Self {
        Self {
            connection: UdpConnection::new(config),
            progress_sender: None,
        }
    }

    pub fn from_connection(connection: UdpConnection) -> Self {
        Self {
            connection,
            progress_sender: None,
        }
    }
    
    pub fn get_connection(&self) -> &UdpConnection {
        &self.connection
    }

    pub fn get_connection_mut(&mut self) -> &mut UdpConnection {
        &mut self.connection
    }
    
    pub fn set_progress_sender(&mut self, sender: mpsc::UnboundedSender<TransferProgress>) {
        self.progress_sender = Some(sender);
    }
    
    /// Receive a file over UDP
    pub async fn receive_file(&mut self, output_dir: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        
        let socket = self.connection.get_socket()
            .ok_or_else(|| TransferError::NetworkError {
                message: "No UDP socket bound".to_string(),
                context: None,
                recoverable: false,
            })?;
        
        // Wait for handshake packet first
        let mut buffer = vec![0u8; 2048];
        let handshake_timeout = Duration::from_secs(60); // Longer timeout for initial connection
        
        tracing::info!("UDP receiver waiting for handshake packet...");
        let (handshake_size, sender_addr) = timeout(handshake_timeout, socket.recv_from(&mut buffer)).await
            .map_err(|_| TransferError::NetworkError {
                message: "Timeout waiting for handshake packet".to_string(),
                context: None,
                recoverable: false,
            })?
            .map_err(|e| TransferError::NetworkError {
                message: format!("Failed to receive handshake: {}", e),
                context: None,
                recoverable: false,
            })?;
        
        tracing::info!("Received handshake from {}: {} bytes", sender_addr, handshake_size);
        
        // Parse handshake
        let handshake_str = String::from_utf8_lossy(&buffer[..handshake_size]);
        let (filename, _expected_size) = if handshake_str.starts_with("HANDSHAKE:") {
            let parts: Vec<&str> = handshake_str.strip_prefix("HANDSHAKE:").unwrap().split(':').collect();
            if parts.len() >= 2 {
                let filename = parts[0].to_string();
                let size = parts[1].parse::<u64>().unwrap_or(0);
                (filename, size)
            } else {
                ("received_file.bin".to_string(), 0)
            }
        } else {
            // No handshake, use default name
            ("received_file.bin".to_string(), 0)
        };
        
        // Create output file with received filename
        let output_path = output_dir.join(&filename);
        
        let mut output_file = File::create(&output_path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to create output file: {}", e),
            file_path: Some(output_path.display().to_string()),
            recoverable: false,
        })?;
        
        let mut buffer = vec![0u8; 2048]; // Buffer for UDP packets
        let mut bytes_received = 0u64;
        let mut _last_packet_time = Instant::now();
        let receive_timeout = Duration::from_secs(10); // Reasonable timeout for UDP packets
        let end_marker = b"END_OF_FILE";
        
        loop {
            // Receive packet with timeout
            let receive_result = timeout(receive_timeout, socket.recv_from(&mut buffer)).await;
            
            match receive_result {
                Ok(Ok((size, _sender_addr))) => {
                    // Check if this is the end marker
                    if size == end_marker.len() && &buffer[..size] == end_marker {
                        // End of file marker received
                        break;
                    } else if size > 0 {
                        // Write received data to file
                        output_file.write_all(&buffer[..size]).await.map_err(|e| TransferError::FileError {
                            message: format!("Failed to write to output file: {}", e),
                            file_path: Some(output_path.display().to_string()),
                            recoverable: false,
                        })?;
                        
                        bytes_received += size as u64;
                    }
                    
                    _last_packet_time = Instant::now();
                    
                    // Emit progress
                    self.emit_progress(bytes_received, start_time.elapsed());
                }
                Ok(Err(e)) => {
                    return Err(TransferError::NetworkError {
                        message: format!("UDP receive error: {}", e),
                        context: None,
                        recoverable: true,
                    });
                }
                Err(_) => {
                    // Timeout - assume transfer is complete
                    break;
                }
            }
            
            // If no packets received for a while, assume transfer is complete
            if _last_packet_time.elapsed() > receive_timeout {
                break;
            }
        }
        
        // Flush and close file
        output_file.flush().await.map_err(|e| TransferError::FileError {
            message: format!("Failed to flush output file: {}", e),
            file_path: Some(output_path.display().to_string()),
            recoverable: false,
        })?;
        drop(output_file);
        
        // Calculate checksum of received file
        let received_checksum = ChecksumCalculator::calculate_file_sha256_async(&output_path).await?;
        
        let duration = start_time.elapsed();
        
        Ok(TransferResult::success(
            self.connection.transfer_id().to_string(),
            bytes_received,
            duration,
            received_checksum,
        ))
    }
    
    fn emit_progress(&self, bytes_received: u64, elapsed: Duration) {
        if let Some(ref sender) = self.progress_sender {
            let speed = if elapsed.as_secs_f64() > 0.0 {
                bytes_received as f64 / elapsed.as_secs_f64()
            } else {
                0.0
            };
            
            // For UDP, we don't know the total size, so progress is indeterminate
            let mut progress_update = TransferProgress::new(self.connection.transfer_id().to_string());
            progress_update.update(0.0, speed, 0); // Indeterminate progress
            
            // Don't ignore send errors - if channel is closed, we should know
            if let Err(_) = sender.send(progress_update) {
                // Channel closed, but continue transfer
                tracing::debug!("Progress channel closed for transfer {}", self.connection.transfer_id());
            }
        }
    }
}