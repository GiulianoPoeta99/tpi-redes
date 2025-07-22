// Transfer execution logic for different protocols
use crate::config::{TransferConfig, Protocol};
use crate::network::tcp::{TcpConnection, TcpFileSender, TcpFileReceiver};
use crate::network::udp::{UdpConnection, UdpFileSender, UdpFileReceiver};
use crate::core::transfer::{TransferResult, TransferProgressUpdate};
use crate::errors::TransferError;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use tokio::sync::mpsc;

/// Handles the execution of file transfers for different protocols
pub struct TransferExecutor;

impl TransferExecutor {
    /// Execute a file transfer (sender)
    pub async fn execute_transfer(
        config: &TransferConfig,
        file_path: &PathBuf,
        target_address: &str,
        progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let target_addr: SocketAddr = target_address.parse()
            .map_err(|e| TransferError::ConfigError {
                message: format!("Invalid target address: {}", e),
                field: Some("target_address".to_string()),
            })?;

        match config.protocol {
            Protocol::Tcp => {
                Self::execute_tcp_transfer(
                    config,
                    file_path,
                    target_addr,
                    progress_tx,
                    transfer_id,
                    cancellation_flag,
                ).await
            }
            Protocol::Udp => {
                Self::execute_udp_transfer(
                    config,
                    file_path,
                    target_addr,
                    progress_tx,
                    transfer_id,
                    cancellation_flag,
                ).await
            }
        }
    }

    /// Execute a file receiver
    pub async fn execute_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: &PathBuf,
        progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        match config.protocol {
            Protocol::Tcp => {
                Self::execute_tcp_receiver(
                    config,
                    bind_addr,
                    output_dir,
                    progress_tx,
                    transfer_id,
                    cancellation_flag,
                ).await
            }
            Protocol::Udp => {
                Self::execute_udp_receiver(
                    config,
                    bind_addr,
                    output_dir,
                    progress_tx,
                    transfer_id,
                    cancellation_flag,
                ).await
            }
        }
    }

    async fn execute_tcp_transfer(
        config: &TransferConfig,
        file_path: &PathBuf,
        target_addr: SocketAddr,
        _progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        _transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let mut tcp_connection = TcpConnection::new(config.clone());
        
        // Connect with timeout
        tcp_connection.connect(target_addr).await?;
        
        let mut tcp_sender = TcpFileSender::from_connection(tcp_connection);

        // Execute transfer with cancellation support
        let transfer_future = tcp_sender.send_file(file_path.clone());
        
        tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    let _ = tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: tcp_sender.get_connection().transfer_id().to_string() 
                })
            }
        }
    }

    async fn execute_udp_transfer(
        config: &TransferConfig,
        file_path: &PathBuf,
        target_addr: SocketAddr,
        progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let mut udp_connection = UdpConnection::new(config.clone());
        
        // Bind to local address
        let local_addr = SocketAddr::from(([0, 0, 0, 0], 0));
        udp_connection.bind(local_addr).await?;
        
        let mut udp_sender = UdpFileSender::from_connection(udp_connection);

        // Set up progress tracking
        let file_size = tokio::fs::metadata(file_path).await
            .map_err(|e| TransferError::FileError {
                message: format!("Failed to read file metadata: {}", e),
                file_path: Some(file_path.display().to_string()),
                recoverable: false,
            })?.len();

        // Create progress sender for UDP transfer
        let (udp_progress_tx, mut udp_progress_rx) = mpsc::unbounded_channel();
        udp_sender.set_progress_sender(udp_progress_tx);

        // Forward UDP progress to main progress channel
        let progress_forward_task = {
            let progress_tx_clone = progress_tx.clone();
            let transfer_id_clone = transfer_id.clone();
            tokio::spawn(async move {
                while let Some(progress) = udp_progress_rx.recv().await {
                    let _ = progress_tx_clone.send(TransferProgressUpdate {
                        transfer_id: transfer_id_clone.clone(),
                        bytes_transferred: (progress.progress * file_size as f64) as u64,
                        total_bytes: file_size,
                        speed: progress.speed,
                        eta: progress.eta,
                    });
                }
            })
        };

        // Execute transfer with cancellation support
        let transfer_future = udp_sender.send_file(file_path.clone(), target_addr);
        
        let result = tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    let _ = tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: transfer_id.clone()
                })
            }
        };

        // Clean up progress forwarding
        let _ = progress_forward_task.await;

        result
    }

    async fn execute_tcp_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: &PathBuf,
        _progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        _transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let listener = TcpConnection::listen(bind_addr).await?;
        
        // Accept connection with timeout
        let (stream, _peer_addr) = TcpConnection::accept_connection(&listener, config.timeout).await?;
        
        let mut tcp_connection = TcpConnection::new(config.clone());
        tcp_connection.set_socket(stream);
        
        let mut tcp_receiver = TcpFileReceiver::from_connection(tcp_connection);

        // Execute receive with cancellation support
        let transfer_future = tcp_receiver.receive_file(output_dir.clone());
        
        tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    let _ = tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: tcp_receiver.get_connection().transfer_id().to_string() 
                })
            }
        }
    }

    async fn execute_udp_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: &PathBuf,
        progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        let mut udp_connection = UdpConnection::new(config.clone());
        udp_connection.bind(bind_addr).await?;
        
        let mut udp_receiver = UdpFileReceiver::from_connection(udp_connection);

        // Set up progress tracking
        let (udp_progress_tx, mut udp_progress_rx) = mpsc::unbounded_channel();
        udp_receiver.set_progress_sender(udp_progress_tx);

        // Forward UDP progress to main progress channel
        let progress_forward_task = {
            let progress_tx_clone = progress_tx.clone();
            let transfer_id_clone = transfer_id.clone();
            tokio::spawn(async move {
                while let Some(progress) = udp_progress_rx.recv().await {
                    let _ = progress_tx_clone.send(TransferProgressUpdate {
                        transfer_id: transfer_id_clone.clone(),
                        bytes_transferred: (progress.progress * 1000000.0) as u64, // Estimate
                        total_bytes: 1000000,
                        speed: progress.speed,
                        eta: progress.eta,
                    });
                }
            })
        };

        // Execute receive with cancellation support
        let transfer_future = udp_receiver.receive_file(output_dir.clone());
        
        let result = tokio::select! {
            result = transfer_future => result,
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    let _ = tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                Err(TransferError::Cancelled { 
                    transfer_id: transfer_id.clone()
                })
            }
        };

        // Clean up progress forwarding
        let _ = progress_forward_task.await;

        result
    }
}