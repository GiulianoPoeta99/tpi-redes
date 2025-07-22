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
        let start_time = Instant::now();
        
        // Get file metadata
        let metadata = FileMetadata::from_path(&file_path).await?;
        let file_size = metadata.size;
        
        // Calculate checksum
        let source_checksum = ChecksumCalculator::calculate_file_sha256_async(&file_path).await?;
        
        let socket = self.connection.get_socket()
            .ok_or_else(|| TransferError::NetworkError {
                message: "No UDP socket bound".to_string(),
                context: None,
                recoverable: false,
            })?;
        
        // Send file chunks
        let mut chunker = FileChunker::new(file_path.clone(), 1024)?; // Smaller chunks for UDP
        let mut bytes_sent = 0u64;
        let mut _chunk_count = 0u32;
        
        // Progress tracking
        let _progress_interval = interval(Duration::from_millis(100));
        let mut last_progress_update = Instant::now();
        
        while let Some(chunk) = chunker.read_next_chunk().await? {
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
            
            let progress_update = TransferProgress::new(self.connection.transfer_id().to_string());
            let mut progress_update = progress_update;
            progress_update.update(progress, speed, eta);
            
            let _ = sender.send(progress_update);
        }
    }
}