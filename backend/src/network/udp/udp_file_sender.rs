// UDP file sending functionality (fire-and-forget)
use crate::config::TransferConfig;
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::errors::TransferError;
use crate::network::udp::UdpConnection;
use crate::core::{
    files::{file_chunker::FileChunker, file_metadata::FileMetadata},
    transfer::{transfer_progress::TransferProgress, transfer_result::TransferResult},
};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Instant;
use tokio::sync::mpsc;
use tokio::time::{interval, Duration};

pub struct UdpFileSender {
    connection: UdpConnection,
    progress_sender: Option<mpsc::UnboundedSender<TransferProgress>>,
}

impl UdpFileSender {
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
    
    /// Send a file over UDP (fire-and-forget)
    pub async fn send_file(&mut self, file_path: PathBuf, target_addr: SocketAddr) -> Result<TransferResult, TransferError> {
        tracing::info!("UDP send_file started for {:?} to {}", file_path, target_addr);
        let start_time = Instant::now();
        
        // Get file metadata
        tracing::info!("Getting file metadata...");
        let metadata = FileMetadata::from_path(&file_path).await?;
        let file_size = metadata.size;
        tracing::info!("File size: {} bytes", file_size);
        
        // Calculate checksum
        tracing::info!("Calculating checksum...");
        let source_checksum = ChecksumCalculator::calculate_file_sha256_async(&file_path).await?;
        tracing::info!("Checksum calculated: {}", source_checksum);
        
        // Ensure socket is bound
        tracing::info!("Checking if socket is bound...");
        if self.connection.get_socket().is_none() {
            tracing::info!("Socket not bound, binding to local address...");
            let local_addr = SocketAddr::from(([0, 0, 0, 0], 0));
            self.get_connection_mut().bind(local_addr).await?;
            tracing::info!("Socket bound successfully");
        } else {
            tracing::info!("Socket already bound");
        }
        
        let socket = self.connection.get_socket()
            .ok_or_else(|| TransferError::NetworkError {
                message: "No UDP socket bound".to_string(),
                context: None,
                recoverable: false,
            })?;

        // Send handshake packet first with file metadata
        let handshake_data = format!("HANDSHAKE:{}:{}", metadata.name, file_size);
        tracing::info!("Sending UDP handshake to {}: {}", target_addr, handshake_data);
        socket.send_to(handshake_data.as_bytes(), target_addr).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to send handshake: {}", e),
            context: Some(target_addr.to_string()),
            recoverable: true,
        })?;
        
        // Wait a bit for receiver to process handshake
        tracing::info!("Handshake sent, waiting before sending file data");
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        // Send file chunks
        let mut chunker = FileChunker::new(file_path.clone(), 1024)?; // Smaller chunks for UDP
        let mut bytes_sent = 0u64;
        let mut _chunk_count = 0u32;
        
        // Progress tracking
        let _progress_interval = interval(Duration::from_millis(100));
        let mut last_progress_update = Instant::now();
        
        tracing::info!("Starting to read file chunks...");
        while let Some(chunk) = chunker.read_next_chunk().await? {
            tracing::info!("Read chunk of {} bytes", chunk.len());
            // Send chunk (fire-and-forget)
            socket.send_to(&chunk, target_addr).await.map_err(|e| TransferError::NetworkError {
                message: format!("Failed to send UDP packet: {}", e),
                context: Some(target_addr.to_string()),
                recoverable: true,
            })?;
            
            bytes_sent += chunk.len() as u64;
            _chunk_count += 1;
            
            // Update progress periodically
            if last_progress_update.elapsed() >= Duration::from_millis(100) {
                self.emit_progress(bytes_sent, file_size, start_time.elapsed());
                last_progress_update = Instant::now();
            }
            
            // Small delay to avoid overwhelming the network
            tokio::time::sleep(Duration::from_micros(100)).await;
        }
        
        tracing::info!("Finished sending {} chunks, {} bytes total", _chunk_count, bytes_sent);
        
        // Send end-of-transfer marker (special packet repeated multiple times for reliability)
        let end_marker = b"END_OF_FILE";
        for _ in 0..5 {
            socket.send_to(end_marker, target_addr).await.map_err(|e| TransferError::NetworkError {
                message: format!("Failed to send end marker: {}", e),
                context: Some(target_addr.to_string()),
                recoverable: true,
            })?;
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        
        // Final progress update
        self.emit_progress(bytes_sent, file_size, start_time.elapsed());
        
        let duration = start_time.elapsed();
        
        Ok(TransferResult::success(
            self.connection.transfer_id().to_string(),
            bytes_sent,
            duration,
            source_checksum,
        ))
    }
    
    fn emit_progress(&self, bytes_sent: u64, total_bytes: u64, elapsed: Duration) {
        if let Some(ref sender) = self.progress_sender {
            let progress = if total_bytes > 0 {
                bytes_sent as f64 / total_bytes as f64
            } else {
                0.0
            };
            
            let speed = if elapsed.as_secs_f64() > 0.0 {
                bytes_sent as f64 / elapsed.as_secs_f64()
            } else {
                0.0
            };
            
            let eta = if speed > 0.0 && total_bytes > bytes_sent {
                ((total_bytes - bytes_sent) as f64 / speed) as u64
            } else {
                0
            };
            
            let mut progress_update = TransferProgress::new(self.connection.transfer_id().to_string());
            progress_update.update(progress, speed, eta);
            
            // Don't ignore send errors - if channel is closed, we should know
            if let Err(_) = sender.send(progress_update) {
                // Channel closed, but continue transfer
                tracing::debug!("Progress channel closed for transfer {}", self.connection.transfer_id());
            }
        }
    }
}