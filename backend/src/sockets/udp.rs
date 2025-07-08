// UDP socket implementation with reliability layer
use crate::config::TransferConfig;
use crate::crypto::checksum_calculator::ChecksumCalculator;
use crate::transfer::{
    ack_status::AckStatus,
    file_chunker::FileChunker,
    protocol_messages::ProtocolMessage,
    transfer_progress::TransferProgress,
    transfer_result::TransferResult,
    transfer_status::TransferStatus,
};
use crate::utils::errors::TransferError;
use std::collections::{HashMap, HashSet, VecDeque};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::net::UdpSocket;
use tokio::sync::mpsc;
use tokio::time::timeout;

pub struct UdpTransfer {
    pub socket: Option<UdpSocket>,
    pub reliability: ReliabilityLayer,
    pub config: TransferConfig,
    pub progress_sender: Option<mpsc::UnboundedSender<TransferProgress>>,
}

pub struct ReliabilityLayer {
    pub window_size: usize,
    pub timeout: Duration,
    pub max_retries: u32,
    pub sequence_tracker: SequenceTracker,
    pub sliding_window: SlidingWindow,
    pub retransmission_queue: RetransmissionQueue,
}

pub struct SequenceTracker {
    pub next_sequence: u32,
    pub received_sequences: HashSet<u32>,
    pub expected_sequence: u32,
    pub out_of_order_buffer: HashMap<u32, Vec<u8>>,
}

pub struct SlidingWindow {
    pub window_start: u32,
    pub window_size: usize,
    pub in_flight: HashMap<u32, InFlightPacket>,
}

pub struct InFlightPacket {
    pub data: Vec<u8>,
    pub sent_time: Instant,
    pub retry_count: u32,
}

pub struct RetransmissionQueue {
    queue: VecDeque<u32>,
    timeout_map: HashMap<u32, Instant>,
}

impl UdpTransfer {
    pub fn new(config: TransferConfig) -> Self {
        Self {
            socket: None,
            reliability: ReliabilityLayer::new(),
            config,
            progress_sender: None,
        }
    }
    
    pub fn set_progress_sender(&mut self, sender: mpsc::UnboundedSender<TransferProgress>) {
        self.progress_sender = Some(sender);
    }
    
    pub async fn bind(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        let socket = UdpSocket::bind(addr).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to bind UDP socket to {}: {}", addr, e),
            context: Some(addr.to_string()),
            recoverable: false,
        })?;
        
        self.socket = Some(socket);
        Ok(())
    }
    
    pub async fn send_file(&mut self, file_path: PathBuf, target: SocketAddr) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        let transfer_id = uuid::Uuid::new_v4().to_string();
        
        // Ensure socket is bound
        if self.socket.is_none() {
            let local_addr = SocketAddr::from(([0, 0, 0, 0], 0));
            self.bind(local_addr).await?;
        }
        
        // Calculate file checksum
        let file_checksum = ChecksumCalculator::calculate_file_sha256(&file_path)?;
        
        // Get file metadata
        let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| TransferError::FileError {
            message: format!("Failed to read file metadata: {}", e),
            file_path: Some(file_path.display().to_string()),
            recoverable: false,
        })?;
        
        let file_size = metadata.len();
        let filename = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        // Send handshake
        let handshake = ProtocolMessage::Handshake {
            filename: filename.clone(),
            size: file_size,
            checksum: file_checksum.clone(),
        };
        
        self.send_message(&handshake, target).await?;
        
        // Wait for handshake acknowledgment
        let handshake_ack = self.receive_message_with_timeout(Duration::from_secs(30)).await?;
        
        match handshake_ack {
            ProtocolMessage::HandshakeAck { accepted: true, .. } => {
                // Proceed with file transfer
            }
            ProtocolMessage::HandshakeAck { accepted: false, reason } => {
                return Err(TransferError::ProtocolError {
                    message: format!("Handshake rejected: {}", reason.unwrap_or_else(|| "Unknown reason".to_string())),
                    protocol: "UDP".to_string(),
                    recoverable: false,
                });
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected handshake acknowledgment".to_string(),
                    protocol: "UDP".to_string(),
                    recoverable: false,
                });
            }
        }
        
        // Initialize file chunker
        let chunker = FileChunker::new_reader(file_path.clone(), self.config.chunk_size).await?;
        let total_chunks = chunker.total_chunks();
        
        // Reset reliability layer for new transfer
        self.reliability.reset();
        
        // Send file chunks with sliding window protocol
        let mut bytes_transferred = 0u64;
        let mut completed_chunks = 0usize;
        
        // Send initial window of chunks
        for chunk_id in 0..std::cmp::min(self.reliability.window_size, total_chunks) {
            self.send_chunk(&chunker, chunk_id as u32, target).await?;
        }
        
        // Process acknowledgments and send remaining chunks
        while completed_chunks < total_chunks {
            let ack_result = timeout(
                self.reliability.timeout,
                self.receive_message()
            ).await;
            
            match ack_result {
                Ok(Ok((msg, _addr))) => {
                    match msg {
                        ProtocolMessage::DataAck { sequence, status } => {
                            match status {
                                AckStatus::Ok => {
                                    if self.reliability.sliding_window.acknowledge_packet(sequence) {
                                        completed_chunks += 1;
                                        bytes_transferred += chunker.chunk_actual_size(sequence) as u64;
                                        
                                        // Send progress update
                                        if let Some(sender) = &self.progress_sender {
                                            let progress = TransferProgress {
                                                transfer_id: transfer_id.clone(),
                                                progress: completed_chunks as f64 / total_chunks as f64,
                                                speed: self.calculate_speed(bytes_transferred, start_time.elapsed()),
                                                eta: self.calculate_eta(completed_chunks, total_chunks, start_time.elapsed()),
                                                status: TransferStatus::Transferring,
                                                error: None,
                                            };
                                            let _ = sender.send(progress);
                                        }
                                        
                                        // Send next chunk if available
                                        let next_chunk = self.reliability.sliding_window.get_next_chunk_to_send();
                                        if next_chunk < total_chunks as u32 {
                                            self.send_chunk(&chunker, next_chunk, target).await?;
                                        }
                                    }
                                }
                                AckStatus::Retry => {
                                    // Retransmit the chunk
                                    self.send_chunk(&chunker, sequence, target).await?;
                                }
                                AckStatus::Error => {
                                    return Err(TransferError::ProtocolError {
                                        message: format!("Receiver reported error for chunk {}", sequence),
                                        protocol: "UDP".to_string(),
                                        recoverable: false,
                                    });
                                }
                            }
                        }
                        ProtocolMessage::Error { code, message } => {
                            return Err(TransferError::ProtocolError {
                                message: format!("Receiver error {}: {}", code, message),
                                protocol: "UDP".to_string(),
                                recoverable: false,
                            });
                        }
                        _ => {
                            // Ignore unexpected messages
                        }
                    }
                }
                Ok(Err(e)) => {
                    return Err(e);
                }
                Err(_) => {
                    // Timeout - check for retransmissions
                    self.handle_timeout(&chunker, target).await?;
                }
            }
        }
        
        // Send transfer complete message
        let complete_msg = ProtocolMessage::TransferComplete {
            checksum: file_checksum.clone(),
        };
        self.send_message(&complete_msg, target).await?;
        
        let duration = start_time.elapsed();
        
        Ok(TransferResult {
            success: true,
            transfer_id,
            bytes_transferred,
            duration,
            checksum: file_checksum,
            error: None,
        })
    }
    
    pub async fn receive_file(&mut self, output_path: PathBuf) -> Result<TransferResult, TransferError> {
        let start_time = Instant::now();
        let transfer_id = uuid::Uuid::new_v4().to_string();
        
        if self.socket.is_none() {
            return Err(TransferError::NetworkError {
                message: "Socket not bound".to_string(),
                context: None,
                recoverable: false,
            });
        }
        
        // Wait for handshake
        let (handshake, sender_addr) = self.receive_message().await?;
        
        let (filename, file_size, expected_checksum) = match handshake {
            ProtocolMessage::Handshake { filename, size, checksum } => {
                (filename, size, checksum)
            }
            _ => {
                return Err(TransferError::ProtocolError {
                    message: "Expected handshake message".to_string(),
                    protocol: "UDP".to_string(),
                    recoverable: false,
                });
            }
        };
        
        // Send handshake acknowledgment
        let handshake_ack = ProtocolMessage::HandshakeAck {
            accepted: true,
            reason: None,
        };
        self.send_message(&handshake_ack, sender_addr).await?;
        
        // Create output file path
        let output_file_path = if output_path.is_dir() {
            output_path.join(&filename)
        } else {
            output_path
        };
        
        // Initialize file chunker for writing
        let chunker = FileChunker::new_writer(output_file_path.clone(), file_size, self.config.chunk_size).await?;
        let total_chunks = chunker.total_chunks();
        
        // Reset reliability layer
        self.reliability.reset();
        
        let mut bytes_received = 0u64;
        let mut received_chunks = 0usize;
        
        // Receive file chunks
        while received_chunks < total_chunks {
            let (msg, _addr) = self.receive_message().await?;
            
            match msg {
                ProtocolMessage::DataChunk { sequence, data } => {
                    let ack_status = if self.reliability.sequence_tracker.is_expected_or_buffered(sequence) {
                        // Write chunk to file
                        match chunker.write_chunk(sequence, data).await {
                            Ok(()) => {
                                self.reliability.sequence_tracker.mark_received(sequence);
                                received_chunks += 1;
                                bytes_received += chunker.chunk_actual_size(sequence) as u64;
                                
                                // Send progress update
                                if let Some(sender) = &self.progress_sender {
                                    let progress = TransferProgress {
                                        transfer_id: transfer_id.clone(),
                                        progress: received_chunks as f64 / total_chunks as f64,
                                        speed: self.calculate_speed(bytes_received, start_time.elapsed()),
                                        eta: self.calculate_eta(received_chunks, total_chunks, start_time.elapsed()),
                                        status: TransferStatus::Transferring,
                                        error: None,
                                    };
                                    let _ = sender.send(progress);
                                }
                                
                                AckStatus::Ok
                            }
                            Err(_) => AckStatus::Error,
                        }
                    } else if self.reliability.sequence_tracker.is_duplicate(sequence) {
                        // Duplicate packet - acknowledge again
                        AckStatus::Ok
                    } else {
                        // Out of order or missing packets
                        self.reliability.sequence_tracker.buffer_out_of_order(sequence, data);
                        AckStatus::Retry
                    };
                    
                    // Send acknowledgment
                    let ack = ProtocolMessage::DataAck { sequence, status: ack_status };
                    self.send_message(&ack, sender_addr).await?;
                }
                ProtocolMessage::TransferComplete { checksum } => {
                    // Verify file integrity
                    let actual_checksum = ChecksumCalculator::calculate_file_sha256(&output_file_path)?;
                    
                    if actual_checksum == expected_checksum && actual_checksum == checksum {
                        let duration = start_time.elapsed();
                        
                        return Ok(TransferResult {
                            success: true,
                            transfer_id,
                            bytes_transferred: bytes_received,
                            duration,
                            checksum: actual_checksum,
                            error: None,
                        });
                    } else {
                        return Err(TransferError::ChecksumMismatch {
                            expected: expected_checksum,
                            actual: actual_checksum,
                            file_path: output_file_path.display().to_string(),
                        });
                    }
                }
                ProtocolMessage::Error { code, message } => {
                    return Err(TransferError::ProtocolError {
                        message: format!("Sender error {}: {}", code, message),
                        protocol: "UDP".to_string(),
                        recoverable: false,
                    });
                }
                _ => {
                    // Ignore unexpected messages
                }
            }
        }
        
        Err(TransferError::ProtocolError {
            message: "Transfer completed without receiving completion message".to_string(),
            protocol: "UDP".to_string(),
            recoverable: false,
        })
    }
    
    async fn send_chunk(&mut self, chunker: &FileChunker, chunk_id: u32, target: SocketAddr) -> Result<(), TransferError> {
        let chunk_data = chunker.read_chunk(chunk_id).await?;
        
        let data_msg = ProtocolMessage::DataChunk {
            sequence: chunk_id,
            data: chunk_data.clone(),
        };
        
        self.send_message(&data_msg, target).await?;
        
        // Track in sliding window
        self.reliability.sliding_window.add_in_flight(chunk_id, chunk_data);
        
        Ok(())
    }
    
    async fn send_message(&self, message: &ProtocolMessage, target: SocketAddr) -> Result<(), TransferError> {
        let serialized = bincode::serialize(message).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to serialize message: {}", e),
            protocol: "UDP".to_string(),
            recoverable: false,
        })?;
        
        let socket = self.socket.as_ref().unwrap();
        socket.send_to(&serialized, target).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to send UDP message: {}", e),
            context: Some(target.to_string()),
            recoverable: true,
        })?;
        
        Ok(())
    }
    
    async fn receive_message(&self) -> Result<(ProtocolMessage, SocketAddr), TransferError> {
        let socket = self.socket.as_ref().unwrap();
        let mut buffer = vec![0u8; 65536]; // Max UDP packet size
        let (len, addr) = socket.recv_from(&mut buffer).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to receive UDP message: {}", e),
            context: None,
            recoverable: true,
        })?;
        
        buffer.truncate(len);
        
        let message = bincode::deserialize(&buffer).map_err(|e| TransferError::ProtocolError {
            message: format!("Failed to deserialize message: {}", e),
            protocol: "UDP".to_string(),
            recoverable: false,
        })?;
        
        Ok((message, addr))
    }
    
    async fn receive_message_with_timeout(&self, timeout_duration: Duration) -> Result<ProtocolMessage, TransferError> {
        let result = timeout(timeout_duration, self.receive_message()).await;
        
        match result {
            Ok(Ok((msg, _addr))) => Ok(msg),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(TransferError::Timeout {
                seconds: timeout_duration.as_secs(),
                operation: "receive_message".to_string(),
                recoverable: true,
            }),
        }
    }
    
    async fn handle_timeout(&mut self, chunker: &FileChunker, target: SocketAddr) -> Result<(), TransferError> {
        let timed_out_packets = self.reliability.sliding_window.get_timed_out_packets(self.reliability.timeout);
        
        for sequence in timed_out_packets {
            if let Some(packet) = self.reliability.sliding_window.get_packet_for_retransmission(sequence) {
                if packet.retry_count < self.reliability.max_retries {
                    // Retransmit the packet
                    self.send_chunk(chunker, sequence, target).await?;
                } else {
                    return Err(TransferError::NetworkError {
                        message: format!("Max retries exceeded for chunk {}", sequence),
                        context: Some(target.to_string()),
                        recoverable: false,
                    });
                }
            }
        }
        
        Ok(())
    }
    
    fn calculate_speed(&self, bytes_transferred: u64, elapsed: Duration) -> f64 {
        if elapsed.as_secs_f64() > 0.0 {
            bytes_transferred as f64 / elapsed.as_secs_f64()
        } else {
            0.0
        }
    }
    
    fn calculate_eta(&self, completed: usize, total: usize, elapsed: Duration) -> u64 {
        if completed > 0 && completed < total {
            let rate = completed as f64 / elapsed.as_secs_f64();
            let remaining = total - completed;
            (remaining as f64 / rate) as u64
        } else {
            0
        }
    }
}
impl
 ReliabilityLayer {
    pub fn new() -> Self {
        Self {
            window_size: 64,
            timeout: Duration::from_millis(1000),
            max_retries: 3,
            sequence_tracker: SequenceTracker::new(),
            sliding_window: SlidingWindow::new(64),
            retransmission_queue: RetransmissionQueue::new(),
        }
    }
    
    pub fn reset(&mut self) {
        self.sequence_tracker.reset();
        self.sliding_window.reset();
        self.retransmission_queue.clear();
    }
}

impl SequenceTracker {
    pub fn new() -> Self {
        Self {
            next_sequence: 0,
            received_sequences: HashSet::new(),
            expected_sequence: 0,
            out_of_order_buffer: HashMap::new(),
        }
    }
    
    pub fn reset(&mut self) {
        self.next_sequence = 0;
        self.received_sequences.clear();
        self.expected_sequence = 0;
        self.out_of_order_buffer.clear();
    }
    
    pub fn get_next_sequence(&mut self) -> u32 {
        let seq = self.next_sequence;
        self.next_sequence += 1;
        seq
    }
    
    pub fn mark_received(&mut self, sequence: u32) {
        self.received_sequences.insert(sequence);
        
        // Update expected sequence if this packet was the next expected one
        if sequence == self.expected_sequence {
            self.expected_sequence += 1;
            
            // Process any buffered out-of-order packets that are now in sequence
            while self.out_of_order_buffer.contains_key(&self.expected_sequence) {
                self.received_sequences.insert(self.expected_sequence);
                self.out_of_order_buffer.remove(&self.expected_sequence);
                self.expected_sequence += 1;
            }
        }
    }
    
    pub fn is_expected_or_buffered(&self, sequence: u32) -> bool {
        sequence >= self.expected_sequence
    }
    
    pub fn is_duplicate(&self, sequence: u32) -> bool {
        self.received_sequences.contains(&sequence)
    }
    
    pub fn buffer_out_of_order(&mut self, sequence: u32, data: Vec<u8>) {
        if sequence > self.expected_sequence && !self.received_sequences.contains(&sequence) {
            self.out_of_order_buffer.insert(sequence, data);
        }
    }
}

impl SlidingWindow {
    pub fn new(window_size: usize) -> Self {
        Self {
            window_start: 0,
            window_size,
            in_flight: HashMap::new(),
        }
    }
    
    pub fn reset(&mut self) {
        self.window_start = 0;
        self.in_flight.clear();
    }
    
    pub fn add_in_flight(&mut self, sequence: u32, data: Vec<u8>) {
        let packet = InFlightPacket {
            data,
            sent_time: Instant::now(),
            retry_count: 0,
        };
        self.in_flight.insert(sequence, packet);
    }
    
    pub fn acknowledge_packet(&mut self, sequence: u32) -> bool {
        if self.in_flight.remove(&sequence).is_some() {
            // Advance window if this was the earliest packet
            while !self.in_flight.contains_key(&self.window_start) && self.window_start <= sequence {
                self.window_start += 1;
            }
            true
        } else {
            false
        }
    }
    
    pub fn get_next_chunk_to_send(&self) -> u32 {
        // Find the next sequence number that's not in flight and within the window
        for i in 0..self.window_size {
            let seq = self.window_start + i as u32;
            if !self.in_flight.contains_key(&seq) {
                return seq;
            }
        }
        self.window_start + self.window_size as u32
    }
    
    pub fn get_timed_out_packets(&self, timeout: Duration) -> Vec<u32> {
        let now = Instant::now();
        self.in_flight
            .iter()
            .filter(|(_, packet)| now.duration_since(packet.sent_time) > timeout)
            .map(|(seq, _)| *seq)
            .collect()
    }
    
    pub fn get_packet_for_retransmission(&mut self, sequence: u32) -> Option<&mut InFlightPacket> {
        if let Some(packet) = self.in_flight.get_mut(&sequence) {
            packet.retry_count += 1;
            packet.sent_time = Instant::now();
            Some(packet)
        } else {
            None
        }
    }
}

impl RetransmissionQueue {
    pub fn new() -> Self {
        Self {
            queue: VecDeque::new(),
            timeout_map: HashMap::new(),
        }
    }
    
    pub fn clear(&mut self) {
        self.queue.clear();
        self.timeout_map.clear();
    }
    
    pub fn add_for_retransmission(&mut self, sequence: u32, timeout: Duration) {
        if !self.timeout_map.contains_key(&sequence) {
            self.queue.push_back(sequence);
            self.timeout_map.insert(sequence, Instant::now() + timeout);
        }
    }
    
    pub fn get_ready_for_retransmission(&mut self) -> Vec<u32> {
        let now = Instant::now();
        let mut ready = Vec::new();
        
        while let Some(&sequence) = self.queue.front() {
            if let Some(&timeout_time) = self.timeout_map.get(&sequence) {
                if now >= timeout_time {
                    ready.push(sequence);
                    self.queue.pop_front();
                    self.timeout_map.remove(&sequence);
                } else {
                    break;
                }
            } else {
                self.queue.pop_front();
            }
        }
        
        ready
    }
    
    pub fn remove(&mut self, sequence: u32) {
        self.timeout_map.remove(&sequence);
        // Note: We don't remove from queue immediately for efficiency
        // It will be filtered out when processing
    }
}