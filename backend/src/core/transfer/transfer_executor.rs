// Transfer execution logic for different protocols
use crate::config::{TransferConfig, Protocol};
use crate::network::tcp::{TcpConnection, TcpFileSender, TcpFileReceiver};
use crate::network::udp::{UdpConnection, UdpFileSender, UdpFileReceiver};
use crate::core::transfer::{TransferResult, TransferProgressUpdate, CommunicationManager};
use crate::errors::TransferError;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{info, warn, error};

/// Handles the execution of file transfers for different protocols
pub struct TransferExecutor;

impl TransferExecutor {
    /// Execute a file transfer (sender)
    pub async fn execute_transfer(
        config: &TransferConfig,
        file_path: &PathBuf,
        target_address: &str,
        _progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        _transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        // Validate communication configuration
        CommunicationManager::validate_communication_config(config)?;
        
        let target_addr: SocketAddr = target_address.parse()
            .map_err(|e| TransferError::ConfigError {
                message: format!("Invalid target address: {}", e),
                field: Some("target_address".to_string()),
            })?;

        info!("Starting file transfer to {} using {:?} protocol", target_addr, config.protocol);

        // Check for cancellation before starting
        if cancellation_flag.load(Ordering::SeqCst) {
            return Err(TransferError::Cancelled { 
                transfer_id: "cancelled_before_start".to_string() 
            });
        }

        // Use communication manager for proper sender/receiver coordination
        let transfer_future = CommunicationManager::start_sender(config, file_path.clone(), target_addr);
        
        // Execute with cancellation support
        tokio::select! {
            result = transfer_future => {
                match result {
                    Ok(transfer_result) => {
                        info!("File transfer completed successfully: {} bytes transferred", transfer_result.bytes_transferred);
                        Ok(transfer_result)
                    }
                    Err(e) => {
                        error!("File transfer failed: {}", e);
                        Err(e)
                    }
                }
            }
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                warn!("File transfer cancelled by user");
                Err(TransferError::Cancelled { 
                    transfer_id: "user_cancelled".to_string() 
                })
            }
        }
    }

    /// Execute a file receiver
    pub async fn execute_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: &PathBuf,
        _progress_tx: mpsc::UnboundedSender<TransferProgressUpdate>,
        _transfer_id: String,
        cancellation_flag: Arc<AtomicBool>,
    ) -> Result<TransferResult, TransferError> {
        // Validate communication configuration
        CommunicationManager::validate_communication_config(config)?;
        
        info!("Starting file receiver on {} using {:?} protocol", bind_addr, config.protocol);

        // Check for cancellation before starting
        if cancellation_flag.load(Ordering::SeqCst) {
            return Err(TransferError::Cancelled { 
                transfer_id: "cancelled_before_start".to_string() 
            });
        }

        // Use communication manager for proper sender/receiver coordination
        let receiver_future = CommunicationManager::start_receiver(config, bind_addr, output_dir.clone());
        
        // Execute with cancellation support
        tokio::select! {
            result = receiver_future => {
                match result {
                    Ok(transfer_result) => {
                        info!("File reception completed successfully: {} bytes received", transfer_result.bytes_transferred);
                        Ok(transfer_result)
                    }
                    Err(e) => {
                        error!("File reception failed: {}", e);
                        Err(e)
                    }
                }
            }
            _ = async {
                while !cancellation_flag.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            } => {
                warn!("File reception cancelled by user");
                Err(TransferError::Cancelled { 
                    transfer_id: "user_cancelled".to_string() 
                })
            }
        }
    }


}