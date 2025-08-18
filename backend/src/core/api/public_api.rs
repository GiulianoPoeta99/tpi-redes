//! # Public API
//!
//! This module provides the main public interface for the file transfer library.
//! It exports all the essential types and functions needed to use the library
//! from external applications, including the Tauri desktop app and CLI.
//!
//! ## Core Types
//!
//! The public API exposes the following main types:
//!
//! - [`TransferConfig`]: Configuration for transfer operations
//! - [`TransferProgress`]: Real-time progress information
//! - [`TransferResult`]: Final transfer results and statistics
//! - [`TransferError`]: Comprehensive error handling
//!
//! ## Main Functions
//!
//! - [`start_file_transfer`]: Initiate a file transfer
//! - [`start_file_receiver`]: Start listening for incoming files
//! - [`get_transfer_progress`]: Monitor transfer progress
//! - [`cancel_transfer`]: Cancel an active transfer

// Main configuration types - these define how transfers are configured
pub use crate::config::{TransferConfig, Protocol, TransferMode};

// Transfer types - core functionality for managing file transfers
pub use crate::core::transfer::{
    TransferProgress, TransferResult, TransferStatus, 
    TransferOrchestrator, TransferSession, CommunicationManager
};

// Error types - comprehensive error handling and recovery
pub use crate::errors::TransferError;

// Event types - real-time notifications and progress updates
pub use crate::utils::events::{BroadcastEventEmitter, EventEmitter, TransferEvent};

// Core interface - main library interface implementation
pub use crate::core::api::library_interface::LibraryInterface;

// ============================================================================
// Legacy Compatibility Functions
// ============================================================================
// These functions provide a simplified interface that maintains backward
// compatibility while delegating to the main LibraryInterface implementation.

/// Initialize the transfer orchestrator system.
/// 
/// This function sets up the internal transfer management system and should be
/// called once before performing any transfer operations.
/// 
/// # Returns
/// 
/// - `Ok(())` if initialization succeeds
/// - `Err(TransferError)` if initialization fails
/// 
/// # Example
/// 
/// ```rust
/// use file_transfer_backend::initialize_orchestrator;
/// 
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     initialize_orchestrator().await?;
///     // Now ready to perform transfers
///     Ok(())
/// }
/// ```
pub async fn initialize_orchestrator() -> Result<(), TransferError> {
    LibraryInterface::initialize_orchestrator().await
}

/// Start a file transfer operation.
/// 
/// Initiates the transfer of a file from the local machine to a remote target.
/// The function returns immediately with a transfer ID that can be used to
/// monitor progress and control the transfer.
/// 
/// # Arguments
/// 
/// - `config`: Transfer configuration including protocol, timeouts, and chunk sizes
/// - `file_path`: Path to the local file to transfer
/// - `target`: Target address in "IP:PORT" format (e.g., "192.168.1.100:8080")
/// 
/// # Returns
/// 
/// - `Ok(String)`: Unique transfer ID for monitoring and control
/// - `Err(TransferError)`: Error if transfer cannot be started
/// 
/// # Example
/// 
/// ```rust
/// use file_transfer_backend::*;
/// 
/// let config = TransferConfig {
///     mode: TransferMode::Transmitter,
///     protocol: Protocol::Tcp,
///     port: 8080,
///     ..Default::default()
/// };
/// 
/// let transfer_id = start_file_transfer(
///     config,
///     "document.pdf".to_string(),
///     "192.168.1.100:8080".to_string()
/// ).await?;
/// ```
pub async fn start_file_transfer(
    config: TransferConfig,
    file_path: String,
    target: String,
) -> Result<String, TransferError> {
    LibraryInterface::start_file_transfer(config, file_path, target).await
}

/// Start a file receiver to listen for incoming transfers.
/// 
/// Sets up a receiver that listens on the specified port for incoming file
/// transfers. The receiver will automatically save received files to the
/// specified output directory.
/// 
/// # Arguments
/// 
/// - `port`: Port number to listen on (1024-65535)
/// - `protocol`: Protocol to use (TCP or UDP)
/// - `output_dir`: Directory where received files will be saved
/// 
/// # Returns
/// 
/// - `Ok(String)`: Unique receiver ID for monitoring and control
/// - `Err(TransferError)`: Error if receiver cannot be started
/// 
/// # Example
/// 
/// ```rust
/// use file_transfer_backend::*;
/// 
/// let receiver_id = start_file_receiver(
///     8080,
///     Protocol::Tcp,
///     "./downloads".to_string()
/// ).await?;
/// ```
pub async fn start_file_receiver(
    port: u16,
    protocol: Protocol,
    output_dir: String,
) -> Result<String, TransferError> {
    LibraryInterface::start_file_receiver(port, protocol, output_dir).await
}

/// Get current progress information for a transfer.
/// 
/// Retrieves real-time progress information including completion percentage,
/// transfer speed, estimated time remaining, and current status.
/// 
/// # Arguments
/// 
/// - `transfer_id`: Transfer ID returned from start_file_transfer or start_file_receiver
/// 
/// # Returns
/// 
/// - `Ok(TransferProgress)`: Current progress information
/// - `Err(TransferError)`: Error if transfer not found or progress unavailable
/// 
/// # Example
/// 
/// ```rust
/// let progress = get_transfer_progress(transfer_id).await?;
/// println!("Progress: {:.1}%", progress.progress * 100.0);
/// println!("Speed: {:.2} MB/s", progress.speed / 1_000_000.0);
/// ```
pub async fn get_transfer_progress(transfer_id: String) -> Result<TransferProgress, TransferError> {
    LibraryInterface::get_transfer_progress(transfer_id).await
}

/// Cancel an active transfer.
/// 
/// Immediately stops an ongoing transfer operation and cleans up associated
/// resources. The transfer cannot be resumed after cancellation.
/// 
/// # Arguments
/// 
/// - `transfer_id`: Transfer ID to cancel
/// 
/// # Returns
/// 
/// - `Ok(())`: Transfer cancelled successfully
/// - `Err(TransferError)`: Error cancelling transfer
/// 
/// # Example
/// 
/// ```rust
/// cancel_transfer(transfer_id).await?;
/// println!("Transfer cancelled");
/// ```
pub async fn cancel_transfer(transfer_id: String) -> Result<(), TransferError> {
    LibraryInterface::cancel_transfer(transfer_id).await
}

/// Get list of all active transfers.
/// 
/// Returns information about all currently running transfers, including
/// both sending and receiving operations.
/// 
/// # Returns
/// 
/// - `Ok(Vec<TransferSession>)`: List of active transfer sessions
/// - `Err(TransferError)`: Error retrieving transfer list
pub async fn get_active_transfers() -> Result<Vec<TransferSession>, TransferError> {
    LibraryInterface::get_active_transfers().await
}

/// Get transfer history.
/// 
/// Returns information about all completed transfers, including successful
/// transfers, failed transfers, and cancelled operations.
/// 
/// # Returns
/// 
/// - `Ok(Vec<TransferSession>)`: List of historical transfer sessions
/// - `Err(TransferError)`: Error retrieving transfer history
pub async fn get_transfer_history() -> Result<Vec<TransferSession>, TransferError> {
    LibraryInterface::get_transfer_history().await
}

/// Clean up completed transfers from memory.
/// 
/// Removes completed transfer sessions from the active transfer list to
/// free up memory. This does not affect transfer history.
/// 
/// # Returns
/// 
/// - `Ok(usize)`: Number of transfers cleaned up
/// - `Err(TransferError)`: Error during cleanup
pub async fn cleanup_completed_transfers() -> Result<usize, TransferError> {
    LibraryInterface::cleanup_completed_transfers().await
}

// ============================================================================
// Communication Manager Convenience Functions
// ============================================================================
// These functions provide direct access to communication management features
// for advanced use cases and configuration validation.

/// Validate a transfer configuration.
/// 
/// Checks that all configuration parameters are valid and compatible with
/// the selected protocol and transfer mode.
/// 
/// # Arguments
/// 
/// - `config`: Configuration to validate
/// 
/// # Returns
/// 
/// - `Ok(())`: Configuration is valid
/// - `Err(TransferError)`: Configuration validation failed
pub fn validate_communication_config(config: &TransferConfig) -> Result<(), TransferError> {
    CommunicationManager::validate_communication_config(config)
}

/// Check if a receiver is available at the target address.
/// 
/// Tests connectivity to a remote receiver before starting a transfer.
/// This is particularly useful for TCP transfers where the receiver must
/// be listening before the sender can connect.
/// 
/// # Arguments
/// 
/// - `protocol`: Protocol to test (TCP or UDP)
/// - `target_addr`: Target socket address
/// - `timeout`: Maximum time to wait for response
/// 
/// # Returns
/// 
/// - `true`: Receiver is available and responding
/// - `false`: Receiver is not available or not responding
/// 
/// # Example
/// 
/// ```rust
/// use std::net::SocketAddr;
/// use std::time::Duration;
/// 
/// let addr: SocketAddr = "192.168.1.100:8080".parse()?;
/// let available = check_receiver_availability(
///     Protocol::Tcp,
///     addr,
///     Duration::from_secs(5)
/// ).await;
/// 
/// if available {
///     println!("Receiver is ready");
/// } else {
///     println!("Receiver not available");
/// }
/// ```
pub async fn check_receiver_availability(
    protocol: Protocol,
    target_addr: std::net::SocketAddr,
    timeout: std::time::Duration,
) -> bool {
    CommunicationManager::check_receiver_availability(protocol, target_addr, timeout).await
}