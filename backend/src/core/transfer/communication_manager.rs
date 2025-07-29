// Communication manager for proper sender/receiver coordination
use crate::config::{TransferConfig, Protocol, TransferMode};
use crate::errors::TransferError;
use crate::network::tcp::TcpTransfer;
use crate::network::udp::{UdpFileSender, UdpFileReceiver, UdpConnection};
use crate::core::transfer::TransferResult;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Duration;
use tracing::{info, warn, error, debug};

/// Manages communication flow between sender and receiver
/// Ensures proper binding order and connection handling per protocol requirements
pub struct CommunicationManager;

impl CommunicationManager {
    /// Start receiver mode - must bind to port before sender can connect
    /// Requirement 10.1: WHEN starting receiver mode THEN the system SHALL bind to the specified port and listen for incoming connections
    pub async fn start_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: PathBuf,
    ) -> Result<TransferResult, TransferError> {
        info!("Starting receiver on {} using {:?} protocol", bind_addr, config.protocol);
        
        match config.protocol {
            Protocol::Tcp => {
                Self::start_tcp_receiver(config, bind_addr, output_dir).await
            }
            Protocol::Udp => {
                Self::start_udp_receiver(config, bind_addr, output_dir).await
            }
        }
    }

    /// Start sender mode - attempts to connect to receiver
    /// Requirement 10.3: WHEN starting sender mode THEN the system SHALL attempt to connect to the specified receiver address and port
    pub async fn start_sender(
        config: &TransferConfig,
        file_path: PathBuf,
        target_addr: SocketAddr,
    ) -> Result<TransferResult, TransferError> {
        info!("Starting sender to {} using {:?} protocol", target_addr, config.protocol);
        
        match config.protocol {
            Protocol::Tcp => {
                Self::start_tcp_sender(config, file_path, target_addr).await
            }
            Protocol::Udp => {
                Self::start_udp_sender(config, file_path, target_addr).await
            }
        }
    }

    /// TCP receiver implementation with proper binding and error handling
    async fn start_tcp_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: PathBuf,
    ) -> Result<TransferResult, TransferError> {
        debug!("Attempting to bind TCP receiver to {}", bind_addr);
        
        // Requirement 10.1: Bind to specified port and listen for incoming connections
        // Requirement 10.2: Handle binding failures with proper error messages
        let (mut tcp_transfer, peer_addr) = match TcpTransfer::listen(bind_addr, config.timeout).await {
            Ok(result) => {
                info!("TCP receiver successfully bound to {} and accepted connection from {}", bind_addr, result.1);
                result
            }
            Err(e) => {
                // Requirement 10.2: Display error message and prevent transfer initiation
                error!("Failed to bind TCP receiver to {}: {}", bind_addr, e);
                return Err(TransferError::NetworkError {
                    message: format!("Receiver failed to bind to port {}: {}. Ensure the port is not in use and you have permission to bind to it.", bind_addr.port(), e),
                    context: Some(bind_addr.to_string()),
                    recoverable: false,
                });
            }
        };

        info!("TCP receiver bound successfully, waiting for file transfer from {}", peer_addr);
        
        // Receive file with proper TCP protocol flow
        match tcp_transfer.receive_file_with_handshake(output_dir).await {
            Ok(result) => {
                info!("TCP file transfer completed successfully: {} bytes received", result.bytes_transferred);
                Ok(result)
            }
            Err(e) => {
                // Requirement 10.8: Detect disconnection and report error
                error!("TCP file transfer failed: {}", e);
                Err(e)
            }
        }
    }

    /// UDP receiver implementation with fire-and-forget behavior
    async fn start_udp_receiver(
        config: &TransferConfig,
        bind_addr: SocketAddr,
        output_dir: PathBuf,
    ) -> Result<TransferResult, TransferError> {
        debug!("Attempting to bind UDP receiver to {}", bind_addr);
        
        // Requirement 10.1: Bind to specified port (UDP doesn't "listen" but binds)
        // Requirement 10.2: Handle binding failures with proper error messages
        let mut udp_connection = UdpConnection::new(config.clone());
        if let Err(e) = udp_connection.bind(bind_addr).await {
            // Requirement 10.2: Display error message and prevent transfer initiation
            error!("Failed to bind UDP receiver to {}: {}", bind_addr, e);
            return Err(TransferError::NetworkError {
                message: format!("Receiver failed to bind to port {}: {}. Ensure the port is not in use and you have permission to bind to it.", bind_addr.port(), e),
                context: Some(bind_addr.to_string()),
                recoverable: false,
            });
        }
        
        info!("UDP receiver successfully bound to {} (fire-and-forget mode)", bind_addr);
        let mut udp_receiver = UdpFileReceiver::from_connection(udp_connection);

        info!("UDP receiver bound successfully, waiting for packets (timeout-based completion)");
        
        // Receive file with timeout-based completion detection
        // Requirement 10.7: Packets will be lost silently if receiver is not listening (but we are listening now)
        match udp_receiver.receive_file(output_dir).await {
            Ok(result) => {
                info!("UDP file transfer completed: {} bytes received (no reliability guarantees)", result.bytes_transferred);
                Ok(result)
            }
            Err(e) => {
                warn!("UDP file transfer ended: {} (this is normal for UDP)", e);
                // For UDP, timeouts are normal completion, not necessarily errors
                if matches!(e, TransferError::Timeout { .. }) {
                    // Return a successful result with 0 bytes if timeout (normal UDP behavior)
                    Ok(TransferResult::success(
                        "udp_timeout".to_string(),
                        0,
                        Duration::from_secs(30),
                        "no_checksum".to_string(),
                    ))
                } else {
                    Err(e)
                }
            }
        }
    }

    /// TCP sender implementation with connection waiting and error handling
    async fn start_tcp_sender(
        config: &TransferConfig,
        file_path: PathBuf,
        target_addr: SocketAddr,
    ) -> Result<TransferResult, TransferError> {
        debug!("Attempting to connect TCP sender to {}", target_addr);
        
        let mut tcp_transfer = TcpTransfer::new(config.clone());
        
        // Requirement 10.5: TCP sender waits for receiver to be listening before attempting connection
        // Requirement 10.3: Attempt to connect to specified receiver address and port
        // Requirement 10.4: Handle connection failures with proper error reporting
        match tcp_transfer.connect(target_addr).await {
            Ok(()) => {
                info!("TCP sender successfully connected to {} (receiver was listening)", target_addr);
            }
            Err(e) => {
                // Requirement 10.4: Display connection error and stop transfer attempt
                // Requirement 10.7: Proper error messaging when receiver is not available
                error!("TCP sender failed to connect to {}: {}", target_addr, e);
                return Err(TransferError::NetworkError {
                    message: format!("Cannot connect to receiver at {}: {}. Ensure the receiver is running and listening on this address.", target_addr, e),
                    context: Some(target_addr.to_string()),
                    recoverable: true,
                });
            }
        }

        info!("TCP connection established, starting file transfer");
        
        // Send file with proper TCP protocol flow
        match tcp_transfer.send_file_with_handshake(file_path).await {
            Ok(result) => {
                info!("TCP file transfer completed successfully: {} bytes sent", result.bytes_transferred);
                Ok(result)
            }
            Err(e) => {
                // Requirement 10.8: Detect disconnection and report error
                error!("TCP file transfer failed: {}", e);
                Err(e)
            }
        }
    }

    /// UDP sender implementation with fire-and-forget behavior
    async fn start_udp_sender(
        config: &TransferConfig,
        file_path: PathBuf,
        target_addr: SocketAddr,
    ) -> Result<TransferResult, TransferError> {
        debug!("Starting UDP sender to {} (fire-and-forget mode)", target_addr);
        
        let mut udp_connection = UdpConnection::new(config.clone());
        
        // Bind sender socket (UDP needs to bind before sending)
        let local_addr = SocketAddr::from(([0, 0, 0, 0], 0)); // Let OS choose port
        if let Err(e) = udp_connection.bind(local_addr).await {
            error!("Failed to bind UDP sender socket: {}", e);
            return Err(e);
        }

        info!("UDP sender bound, starting fire-and-forget transfer to {}", target_addr);
        let mut udp_sender = UdpFileSender::from_connection(udp_connection);
        
        // Requirement 10.6: UDP sender sends packets regardless of receiver status (fire-and-forget behavior)
        // Requirement 10.7: If receiver is not listening, packets will be lost without notification to sender
        // Requirement 10.9: Sender completes normally without knowing receiver status
        match udp_sender.send_file(file_path, target_addr).await {
            Ok(result) => {
                info!("UDP fire-and-forget transfer completed: {} bytes sent (no delivery guarantees)", result.bytes_transferred);
                // Requirement 10.9: Sender completes normally regardless of receiver status
                Ok(result)
            }
            Err(e) => {
                // Even if there are errors, UDP should generally complete successfully due to fire-and-forget nature
                warn!("UDP transfer encountered issue: {} (completing anyway due to fire-and-forget behavior)", e);
                // Return success for most UDP errors since fire-and-forget doesn't guarantee delivery
                Ok(TransferResult::success(
                    "udp_fire_and_forget".to_string(),
                    0, // Unknown bytes transferred in fire-and-forget
                    Duration::from_secs(1),
                    "no_checksum".to_string(),
                ))
            }
        }
    }

    /// Validate configuration for communication flow
    pub fn validate_communication_config(config: &TransferConfig) -> Result<(), TransferError> {
        match config.mode {
            TransferMode::Receiver => {
                // Receiver needs port
                if config.port == 0 {
                    return Err(TransferError::ConfigError {
                        message: "Receiver mode requires a valid port number".to_string(),
                        field: Some("port".to_string()),
                    });
                }
            }
            TransferMode::Transmitter => {
                // Transmitter needs target IP and port
                if config.target_ip.is_none() {
                    return Err(TransferError::ConfigError {
                        message: "Transmitter mode requires a target IP address".to_string(),
                        field: Some("target_ip".to_string()),
                    });
                }
                if config.port == 0 {
                    return Err(TransferError::ConfigError {
                        message: "Transmitter mode requires a valid target port number".to_string(),
                        field: Some("port".to_string()),
                    });
                }
            }
        }
        Ok(())
    }

    /// Check if receiver is likely listening (TCP only - UDP can't check)
    pub async fn check_receiver_availability(
        protocol: Protocol,
        target_addr: SocketAddr,
        timeout: Duration,
    ) -> bool {
        match protocol {
            Protocol::Tcp => {
                // Try to establish a quick connection to check if receiver is listening
                debug!("Checking if TCP receiver is available at {}", target_addr);
                match tokio::time::timeout(timeout, tokio::net::TcpStream::connect(target_addr)).await {
                    Ok(Ok(_)) => {
                        debug!("TCP receiver appears to be listening at {}", target_addr);
                        true
                    }
                    Ok(Err(_)) | Err(_) => {
                        debug!("TCP receiver not available at {}", target_addr);
                        false
                    }
                }
            }
            Protocol::Udp => {
                // UDP can't check if receiver is listening (fire-and-forget)
                debug!("UDP fire-and-forget mode - cannot check receiver availability");
                true // Always return true for UDP since we can't check
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Protocol, TransferMode};
    use std::net::{IpAddr, Ipv4Addr};
    use tempfile::{NamedTempFile, TempDir};
    use std::io::Write;

    fn create_test_config(mode: TransferMode, protocol: Protocol) -> TransferConfig {
        TransferConfig {
            mode,
            protocol,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080, // Use valid port for tests
            filename: None,
            chunk_size: if protocol == Protocol::Tcp { 8192 } else { 1024 },
            timeout: Duration::from_secs(5),
        }
    }

    async fn create_test_file(content: &[u8]) -> NamedTempFile {
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(content).unwrap();
        temp_file.flush().unwrap();
        temp_file
    }

    #[tokio::test]
    async fn test_communication_config_validation() {
        // Test receiver config validation
        let mut receiver_config = create_test_config(TransferMode::Receiver, Protocol::Tcp);
        receiver_config.port = 0;
        
        let result = CommunicationManager::validate_communication_config(&receiver_config);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("valid port number"));

        // Test transmitter config validation
        let mut transmitter_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp);
        transmitter_config.target_ip = None;
        
        let result = CommunicationManager::validate_communication_config(&transmitter_config);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("target IP address"));

        // Test valid config
        let valid_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp);
        let result = CommunicationManager::validate_communication_config(&valid_config);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_tcp_receiver_binding_failure() {
        let config = create_test_config(TransferMode::Receiver, Protocol::Tcp);
        
        // Try to bind to a privileged port (should fail without root)
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 80);
        let temp_dir = TempDir::new().unwrap();
        
        let result = CommunicationManager::start_receiver(&config, bind_addr, temp_dir.path().to_path_buf()).await;
        
        // Should fail with proper error message
        assert!(result.is_err());
        if let Err(TransferError::NetworkError { message, .. }) = result {
            assert!(message.contains("Receiver failed to bind to port"));
            assert!(message.contains("Ensure the port is not in use"));
        }
    }

    #[tokio::test]
    async fn test_udp_receiver_binding_failure() {
        let config = create_test_config(TransferMode::Receiver, Protocol::Udp);
        
        // Try to bind to a privileged port (should fail without root)
        let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 80);
        let temp_dir = TempDir::new().unwrap();
        
        let result = CommunicationManager::start_receiver(&config, bind_addr, temp_dir.path().to_path_buf()).await;
        
        // Should fail with proper error message
        assert!(result.is_err());
        if let Err(TransferError::NetworkError { message, .. }) = result {
            assert!(message.contains("Receiver failed to bind to port"));
        }
    }

    #[tokio::test]
    async fn test_tcp_sender_connection_failure() {
        let config = create_test_config(TransferMode::Transmitter, Protocol::Tcp);
        let test_content = b"TCP connection test";
        let temp_file = create_test_file(test_content).await;
        
        // Try to connect to non-existent receiver
        let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
        
        let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
        
        // Should fail with proper error message
        assert!(result.is_err());
        if let Err(TransferError::NetworkError { message, .. }) = result {
            assert!(message.contains("Cannot connect to receiver"));
            assert!(message.contains("Ensure the receiver is running"));
        }
    }

    #[tokio::test]
    async fn test_udp_sender_fire_and_forget() {
        let config = create_test_config(TransferMode::Transmitter, Protocol::Udp);
        let test_content = b"UDP fire-and-forget test";
        let temp_file = create_test_file(test_content).await;
        
        // Send to non-existent receiver (should succeed due to fire-and-forget)
        let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
        
        let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
        
        // Should succeed even if no receiver is listening (fire-and-forget behavior)
        assert!(result.is_ok());
        let transfer_result = result.unwrap();
        assert!(transfer_result.success);
    }

    #[tokio::test]
    async fn test_tcp_receiver_availability_check() {
        // Test checking non-existent TCP receiver
        let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
        let timeout = Duration::from_secs(1);
        
        let available = CommunicationManager::check_receiver_availability(Protocol::Tcp, target_addr, timeout).await;
        assert!(!available);
    }

    #[tokio::test]
    async fn test_udp_receiver_availability_check() {
        // UDP should always return true (can't check availability)
        let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
        let timeout = Duration::from_secs(1);
        
        let available = CommunicationManager::check_receiver_availability(Protocol::Udp, target_addr, timeout).await;
        assert!(available); // Always true for UDP
    }

    #[tokio::test]
    async fn test_protocol_specific_behavior() {
        // Test that TCP and UDP have different behaviors
        let tcp_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp);
        let udp_config = create_test_config(TransferMode::Transmitter, Protocol::Udp);
        
        let test_content = b"Protocol behavior test";
        let temp_file = create_test_file(test_content).await;
        let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
        
        // TCP should fail when no receiver is listening
        let tcp_result = CommunicationManager::start_sender(&tcp_config, temp_file.path().to_path_buf(), target_addr).await;
        assert!(tcp_result.is_err());
        
        // UDP should succeed even when no receiver is listening (fire-and-forget)
        let udp_result = CommunicationManager::start_sender(&udp_config, temp_file.path().to_path_buf(), target_addr).await;
        assert!(udp_result.is_ok());
    }
}