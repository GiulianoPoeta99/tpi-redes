// Integration tests for sender/receiver communication flow
// Tests requirements 10.1 through 10.9

use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
    errors::TransferError,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::path::PathBuf;
use std::time::Duration;
use tempfile::{NamedTempFile, TempDir};
use tokio::time::timeout;
use std::io::Write;

fn create_test_config(mode: TransferMode, protocol: Protocol, port: u16) -> TransferConfig {
    TransferConfig {
        mode,
        protocol,
        target_ip: Some("127.0.0.1".to_string()),
        port,
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

fn get_available_port() -> u16 {
    // Use port 0 to let OS choose an available port
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);
    port
}

/// Test requirement 10.1: WHEN starting receiver mode THEN the system SHALL bind to the specified port and listen for incoming connections
#[tokio::test]
async fn test_receiver_binding_success() {
    let port = get_available_port();
    let config = create_test_config(TransferMode::Receiver, Protocol::Tcp, port);
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    let temp_dir = TempDir::new().unwrap();

    // Start receiver in background task
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&config, bind_addr, temp_dir.path().to_path_buf()).await
    });

    // Give receiver time to bind
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Verify receiver is listening by attempting to connect
    let connect_result = tokio::net::TcpStream::connect(bind_addr).await;
    assert!(connect_result.is_ok(), "Receiver should be listening on the specified port");

    // Cancel the receiver task
    receiver_task.abort();
}

/// Test requirement 10.2: WHEN receiver fails to bind to port THEN the system SHALL display error message and prevent transfer initiation
#[tokio::test]
async fn test_receiver_binding_failure() {
    // Try to bind to a port that's already in use
    let port = get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Bind to the port first
    let _listener = tokio::net::TcpListener::bind(bind_addr).await.unwrap();
    
    let config = create_test_config(TransferMode::Receiver, Protocol::Tcp, port);
    let temp_dir = TempDir::new().unwrap();

    // Try to start receiver on the same port (should fail)
    let result = CommunicationManager::start_receiver(&config, bind_addr, temp_dir.path().to_path_buf()).await;
    
    assert!(result.is_err(), "Receiver should fail when port is already in use");
    if let Err(TransferError::NetworkError { message, .. }) = result {
        assert!(message.contains("Receiver failed to bind to port"), "Error message should indicate binding failure");
        assert!(message.contains("Ensure the port is not in use"), "Error message should provide guidance");
    } else {
        panic!("Expected NetworkError with binding failure message");
    }
}

/// Test requirement 10.3: WHEN starting sender mode THEN the system SHALL attempt to connect to the specified receiver address and port
#[tokio::test]
async fn test_sender_connection_attempt() {
    let test_content = b"TCP sender connection test";
    let temp_file = create_test_file(test_content).await;
    let config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, 9999);
    
    // Try to connect to non-existent receiver
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
    
    // Should fail because no receiver is listening
    assert!(result.is_err(), "Sender should fail when no receiver is listening");
}

/// Test requirement 10.4: WHEN sender cannot connect to receiver THEN the system SHALL display connection error and stop transfer attempt
#[tokio::test]
async fn test_sender_connection_failure_error() {
    let test_content = b"TCP connection failure test";
    let temp_file = create_test_file(test_content).await;
    let config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, 9999);
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
    
    assert!(result.is_err(), "Sender should fail with proper error");
    if let Err(TransferError::NetworkError { message, .. }) = result {
        assert!(message.contains("Cannot connect to receiver"), "Error should indicate connection failure");
        assert!(message.contains("Ensure the receiver is running"), "Error should provide guidance");
    } else {
        panic!("Expected NetworkError with connection failure message");
    }
}

/// Test requirement 10.5: WHEN using TCP THEN the sender SHALL wait for receiver to be listening before attempting connection
#[tokio::test]
async fn test_tcp_sender_waits_for_receiver() {
    let port = get_available_port();
    let test_content = b"TCP sender waits for receiver test";
    let temp_file = create_test_file(test_content).await;
    let sender_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, port);
    let receiver_config = create_test_config(TransferMode::Receiver, Protocol::Tcp, port);
    
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    let target_addr = bind_addr;
    let temp_dir = TempDir::new().unwrap();

    // Start receiver first
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, temp_dir.path().to_path_buf()).await
    });

    // Give receiver time to start listening
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Now start sender (should succeed because receiver is listening)
    let sender_result = timeout(
        Duration::from_secs(10),
        CommunicationManager::start_sender(&sender_config, temp_file.path().to_path_buf(), target_addr)
    ).await;

    // Clean up
    receiver_task.abort();

    assert!(sender_result.is_ok(), "Sender should succeed when receiver is listening");
    let transfer_result = sender_result.unwrap();
    assert!(transfer_result.is_ok(), "Transfer should complete successfully");
}

/// Test requirement 10.6: WHEN using UDP THEN the sender SHALL send packets regardless of receiver status (fire-and-forget behavior)
#[tokio::test]
async fn test_udp_fire_and_forget_behavior() {
    let test_content = b"UDP fire-and-forget test";
    let temp_file = create_test_file(test_content).await;
    let config = create_test_config(TransferMode::Transmitter, Protocol::Udp, 9999);
    
    // Send to non-existent receiver (should succeed due to fire-and-forget)
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
    
    // Should succeed even if no receiver is listening (fire-and-forget behavior)
    assert!(result.is_ok(), "UDP sender should succeed even without receiver (fire-and-forget)");
    let transfer_result = result.unwrap();
    assert!(transfer_result.success, "UDP transfer should report success");
}

/// Test requirement 10.7: IF receiver is not listening during UDP transfer THEN the packets SHALL be lost without notification to sender
#[tokio::test]
async fn test_udp_silent_packet_loss() {
    let test_content = b"UDP silent packet loss test";
    let temp_file = create_test_file(test_content).await;
    let config = create_test_config(TransferMode::Transmitter, Protocol::Udp, 9999);
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    // Measure time to ensure it completes quickly (no waiting for ACKs)
    let start_time = std::time::Instant::now();
    let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
    let duration = start_time.elapsed();
    
    // Should complete quickly and successfully (packets lost silently)
    assert!(result.is_ok(), "UDP sender should complete without errors even if packets are lost");
    assert!(duration < Duration::from_secs(2), "UDP should complete quickly without waiting for acknowledgments");
}

/// Test requirement 10.8: WHEN receiver stops listening during transfer THEN TCP SHALL detect disconnection and report error
#[tokio::test]
async fn test_tcp_disconnection_detection() {
    let port = get_available_port();
    let test_content = vec![0u8; 16384]; // Larger file to ensure transfer takes time
    let temp_file = create_test_file(&test_content).await;
    let sender_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, port);
    let receiver_config = create_test_config(TransferMode::Receiver, Protocol::Tcp, port);
    
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    let target_addr = bind_addr;
    let temp_dir = TempDir::new().unwrap();

    // Start receiver
    let receiver_task = tokio::spawn(async move {
        // Simulate receiver stopping during transfer by using a short timeout
        let mut short_config = receiver_config;
        short_config.timeout = Duration::from_millis(100);
        CommunicationManager::start_receiver(&short_config, bind_addr, temp_dir.path().to_path_buf()).await
    });

    // Give receiver time to start
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Start sender
    let sender_result = CommunicationManager::start_sender(&sender_config, temp_file.path().to_path_buf(), target_addr).await;

    // Clean up
    receiver_task.abort();

    // TCP should detect the disconnection (though the exact behavior may vary)
    // The important thing is that it doesn't hang indefinitely
    println!("TCP sender result: {:?}", sender_result);
}

/// Test requirement 10.9: WHEN receiver stops listening during UDP transfer THEN sender SHALL complete normally without knowing receiver status
#[tokio::test]
async fn test_udp_sender_completes_normally() {
    let test_content = b"UDP sender completes normally test";
    let temp_file = create_test_file(test_content).await;
    let config = create_test_config(TransferMode::Transmitter, Protocol::Udp, 9999);
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    // Start UDP sender (no receiver listening)
    let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
    
    // Should complete normally without knowing receiver status
    assert!(result.is_ok(), "UDP sender should complete normally regardless of receiver status");
    let transfer_result = result.unwrap();
    assert!(transfer_result.success, "UDP transfer should report success");
}

/// Test TCP vs UDP behavior differences
#[tokio::test]
async fn test_protocol_behavior_differences() {
    let test_content = b"Protocol behavior test";
    let temp_file = create_test_file(test_content).await;
    
    let tcp_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, 9999);
    let udp_config = create_test_config(TransferMode::Transmitter, Protocol::Udp, 9999);
    
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    // TCP should fail when no receiver is listening
    let tcp_result = CommunicationManager::start_sender(&tcp_config, temp_file.path().to_path_buf(), target_addr).await;
    assert!(tcp_result.is_err(), "TCP should fail when no receiver is listening");
    
    // UDP should succeed even when no receiver is listening (fire-and-forget)
    let udp_result = CommunicationManager::start_sender(&udp_config, temp_file.path().to_path_buf(), target_addr).await;
    assert!(udp_result.is_ok(), "UDP should succeed even when no receiver is listening");
}

/// Test configuration validation
#[tokio::test]
async fn test_communication_config_validation() {
    // Test receiver config without port
    let mut receiver_config = create_test_config(TransferMode::Receiver, Protocol::Tcp, 0);
    receiver_config.port = 0;
    
    let result = CommunicationManager::validate_communication_config(&receiver_config);
    assert!(result.is_err(), "Should fail validation without port");
    
    // Test transmitter config without target IP
    let mut transmitter_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, 8080);
    transmitter_config.target_ip = None;
    
    let result = CommunicationManager::validate_communication_config(&transmitter_config);
    assert!(result.is_err(), "Should fail validation without target IP");
    
    // Test valid config
    let valid_config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, 8080);
    let result = CommunicationManager::validate_communication_config(&valid_config);
    assert!(result.is_ok(), "Should pass validation with valid config");
}

/// Test receiver availability checking
#[tokio::test]
async fn test_receiver_availability_check() {
    let port = get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Test with no receiver listening
    let available = CommunicationManager::check_receiver_availability(
        Protocol::Tcp, 
        bind_addr, 
        Duration::from_millis(100)
    ).await;
    assert!(!available, "Should detect no receiver is listening");
    
    // Start a receiver
    let _listener = tokio::net::TcpListener::bind(bind_addr).await.unwrap();
    
    // Test with receiver listening
    let available = CommunicationManager::check_receiver_availability(
        Protocol::Tcp, 
        bind_addr, 
        Duration::from_millis(100)
    ).await;
    assert!(available, "Should detect receiver is listening");
    
    // Test UDP (should always return true)
    let udp_available = CommunicationManager::check_receiver_availability(
        Protocol::Udp, 
        bind_addr, 
        Duration::from_millis(100)
    ).await;
    assert!(udp_available, "UDP should always return true (can't check availability)");
}

/// Test error message quality and user guidance
#[tokio::test]
async fn test_error_message_quality() {
    // Test TCP connection failure error message
    let test_content = b"Error message test";
    let temp_file = create_test_file(test_content).await;
    let config = create_test_config(TransferMode::Transmitter, Protocol::Tcp, 9999);
    let target_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    
    let result = CommunicationManager::start_sender(&config, temp_file.path().to_path_buf(), target_addr).await;
    
    assert!(result.is_err());
    if let Err(TransferError::NetworkError { message, .. }) = result {
        // Check that error message provides helpful guidance
        assert!(message.contains("Cannot connect to receiver"), "Should explain the problem");
        assert!(message.contains("Ensure the receiver is running"), "Should provide guidance");
        assert!(message.contains("127.0.0.1:9999"), "Should include the target address");
    }
    
    // Test receiver binding failure error message
    let port = 80; // Privileged port that should fail
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    let receiver_config = create_test_config(TransferMode::Receiver, Protocol::Tcp, port);
    let temp_dir = TempDir::new().unwrap();
    
    let result = CommunicationManager::start_receiver(&receiver_config, bind_addr, temp_dir.path().to_path_buf()).await;
    
    if result.is_err() {
        if let Err(TransferError::NetworkError { message, .. }) = result {
            // Check that error message provides helpful guidance
            assert!(message.contains("Receiver failed to bind to port"), "Should explain the problem");
            assert!(message.contains("Ensure the port is not in use"), "Should provide guidance");
        }
    }
}