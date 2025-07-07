use crate::config::{Protocol, TransferConfig, TransferMode};
use crate::sockets::tcp::TcpTransfer;
use crate::transfer::protocol_messages::ProtocolMessage;
use std::io::Write;
use std::net::SocketAddr;
use std::time::Duration;
use tempfile::{NamedTempFile, TempDir};
use tokio::fs;
use tokio::net::TcpListener;
use tokio::time::timeout;

/// Helper function to create a test configuration
fn create_test_config(mode: TransferMode) -> TransferConfig {
    TransferConfig {
        mode,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 0, // Will be set dynamically
        filename: None,
        chunk_size: 1024,
        timeout: Duration::from_secs(5),
    }
}

/// Helper function to create a test file with specific content
fn create_test_file(content: &[u8]) -> NamedTempFile {
    let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");
    temp_file.write_all(content).expect("Failed to write test data");
    temp_file.flush().expect("Failed to flush test data");
    temp_file
}

/// Helper function to get available port
async fn get_available_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    addr.port()
}

#[tokio::test]
async fn test_tcp_connection_success() {
    let port = get_available_port().await;
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    
    // Start a listener
    let listener = TcpTransfer::listen(addr).await.unwrap();
    
    // Create a client and connect
    let mut config = create_test_config(TransferMode::Transmitter);
    config.port = port;
    let mut client = TcpTransfer::new(config);
    
    // Test connection in a separate task
    let connect_task = tokio::spawn(async move {
        client.connect(addr).await
    });
    
    // Accept the connection
    let accept_result = timeout(Duration::from_secs(1), listener.accept()).await;
    assert!(accept_result.is_ok());
    
    // Verify client connected successfully
    let connect_result = connect_task.await.unwrap();
    assert!(connect_result.is_ok());
}

#[tokio::test]
async fn test_tcp_connection_timeout() {
    // Try to connect to a non-existent server
    let addr: SocketAddr = "192.0.2.1:12345".parse().unwrap(); // RFC 5737 test address
    
    let mut config = create_test_config(TransferMode::Transmitter);
    config.timeout = Duration::from_millis(100); // Very short timeout
    let mut client = TcpTransfer::new(config);
    
    let result = client.connect(addr).await;
    assert!(result.is_err());
    
    if let Err(e) = result {
        assert!(matches!(e, crate::utils::errors::TransferError::Timeout { .. }));
    }
}

#[tokio::test]
async fn test_tcp_file_transfer_small_file() {
    let test_data = b"Hello, World! This is a test file for TCP transfer.";
    let temp_file = create_test_file(test_data);
    let temp_dir = TempDir::new().unwrap();
    let output_path = temp_dir.path().join("received_file.txt");
    
    let port = get_available_port().await;
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    
    // Start receiver
    let receiver_output_path = output_path.clone();
    let receiver_task = tokio::spawn(async move {
        let listener = TcpTransfer::listen(addr).await.unwrap();
        let (stream, _) = TcpTransfer::accept_connection(&listener, Duration::from_secs(5)).await.unwrap();
        
        let config = create_test_config(TransferMode::Receiver);
        let mut receiver = TcpTransfer::new(config);
        receiver.set_socket(stream);
        
        receiver.receive_file(receiver_output_path).await
    });
    
    // Give receiver time to start
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Start sender
    let sender_task = tokio::spawn(async move {
        let mut config = create_test_config(TransferMode::Transmitter);
        config.port = port;
        let mut sender = TcpTransfer::new(config);
        
        sender.connect(addr).await.unwrap();
        sender.send_file(temp_file.path().to_path_buf()).await
    });
    
    // Wait for both tasks to complete
    let (receiver_result, sender_result) = tokio::join!(receiver_task, sender_task);
    
    let receiver_result = receiver_result.unwrap();
    let sender_result = sender_result.unwrap();
    
    assert!(receiver_result.is_ok());
    assert!(sender_result.is_ok());
    
    let receiver_result = receiver_result.unwrap();
    let sender_result = sender_result.unwrap();
    
    // Verify transfer results
    assert!(receiver_result.success);
    assert!(sender_result.success);
    assert_eq!(receiver_result.bytes_transferred, test_data.len() as u64);
    assert_eq!(sender_result.bytes_transferred, test_data.len() as u64);
    assert_eq!(receiver_result.checksum, sender_result.checksum);
    
    // Verify file content
    let received_content = fs::read(&output_path).await.unwrap();
    assert_eq!(received_content, test_data);
}

#[tokio::test]
async fn test_tcp_file_transfer_large_file() {
    // Create a larger test file (10KB)
    let test_data = vec![0xAB; 10240];
    let temp_file = create_test_file(&test_data);
    let temp_dir = TempDir::new().unwrap();
    let output_path = temp_dir.path().join("large_received_file.txt");
    
    let port = get_available_port().await;
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    
    // Start receiver
    let receiver_output_path = output_path.clone();
    let receiver_task = tokio::spawn(async move {
        let listener = TcpTransfer::listen(addr).await.unwrap();
        let (stream, _) = TcpTransfer::accept_connection(&listener, Duration::from_secs(10)).await.unwrap();
        
        let mut config = create_test_config(TransferMode::Receiver);
        config.chunk_size = 512; // Smaller chunks to test chunking
        let mut receiver = TcpTransfer::new(config);
        receiver.set_socket(stream);
        
        receiver.receive_file(receiver_output_path).await
    });
    
    // Give receiver time to start
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Start sender
    let sender_task = tokio::spawn(async move {
        let mut config = create_test_config(TransferMode::Transmitter);
        config.port = port;
        config.chunk_size = 512; // Smaller chunks to test chunking
        let mut sender = TcpTransfer::new(config);
        
        sender.connect(addr).await.unwrap();
        sender.send_file(temp_file.path().to_path_buf()).await
    });
    
    // Wait for both tasks to complete
    let (receiver_result, sender_result) = tokio::join!(receiver_task, sender_task);
    
    let receiver_result = receiver_result.unwrap();
    let sender_result = sender_result.unwrap();
    
    assert!(receiver_result.is_ok());
    assert!(sender_result.is_ok());
    
    let receiver_result = receiver_result.unwrap();
    let sender_result = sender_result.unwrap();
    
    // Verify transfer results
    assert!(receiver_result.success);
    assert!(sender_result.success);
    assert_eq!(receiver_result.bytes_transferred, test_data.len() as u64);
    assert_eq!(sender_result.bytes_transferred, test_data.len() as u64);
    assert_eq!(receiver_result.checksum, sender_result.checksum);
    
    // Verify file content
    let received_content = fs::read(&output_path).await.unwrap();
    assert_eq!(received_content, test_data);
}

#[tokio::test]
async fn test_tcp_handshake_rejection() {
    // This test would require exposing internal message methods
    // For now, we'll test handshake rejection through integration testing
    // by creating a receiver that immediately closes the connection
    let port = get_available_port().await;
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    
    // Start a receiver that immediately closes
    let receiver_task = tokio::spawn(async move {
        let listener = TcpTransfer::listen(addr).await.unwrap();
        let (_stream, _) = TcpTransfer::accept_connection(&listener, Duration::from_secs(5)).await.unwrap();
        // Connection closes when stream is dropped
    });
    
    // Give receiver time to start
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Start sender
    let test_data = b"Test data";
    let temp_file = create_test_file(test_data);
    
    let sender_task = tokio::spawn(async move {
        let mut config = create_test_config(TransferMode::Transmitter);
        config.port = port;
        let mut sender = TcpTransfer::new(config);
        
        sender.connect(addr).await.unwrap();
        sender.send_file(temp_file.path().to_path_buf()).await
    });
    
    // Wait for both tasks
    let (receiver_result, sender_result) = tokio::join!(receiver_task, sender_task);
    
    receiver_result.unwrap(); // Should complete successfully
    let sender_result = sender_result.unwrap();
    
    // Sender should receive an error due to connection being closed
    assert!(sender_result.is_err());
}

#[tokio::test]
async fn test_tcp_connection_recovery() {
    let mut config = create_test_config(TransferMode::Transmitter);
    config.timeout = Duration::from_millis(100);
    let mut client = TcpTransfer::new(config);
    
    // Try to reconnect to a non-existent server (should fail)
    let addr: SocketAddr = "192.0.2.1:12345".parse().unwrap();
    let result = client.reconnect(addr).await;
    
    assert!(result.is_err());
    if let Err(e) = result {
        assert!(matches!(e, crate::utils::errors::TransferError::NetworkError { .. }));
    }
}

#[tokio::test]
async fn test_tcp_transfer_id_generation() {
    let config = create_test_config(TransferMode::Transmitter);
    let transfer1 = TcpTransfer::new(config.clone());
    let transfer2 = TcpTransfer::new(config);
    
    // Each transfer should have a unique ID
    assert_ne!(transfer1.transfer_id(), transfer2.transfer_id());
    assert!(!transfer1.transfer_id().is_empty());
    assert!(!transfer2.transfer_id().is_empty());
}

#[tokio::test]
async fn test_tcp_connection_state() {
    let config = create_test_config(TransferMode::Transmitter);
    let mut client = TcpTransfer::new(config);
    
    // Initially not connected
    assert!(!client.is_connected());
    
    let port = get_available_port().await;
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    
    // Start a listener
    let _listener = TcpTransfer::listen(addr).await.unwrap();
    
    // Connect
    let connect_task = tokio::spawn(async move {
        client.connect(addr).await.unwrap();
        assert!(client.is_connected());
        
        // Close connection
        client.close().await.unwrap();
        assert!(!client.is_connected());
    });
    
    connect_task.await.unwrap();
}

#[tokio::test]
async fn test_message_serialization() {
    
    // Test different message types
    let messages = vec![
        ProtocolMessage::Handshake {
            filename: "test.txt".to_string(),
            size: 1024,
            checksum: "abc123".to_string(),
        },
        ProtocolMessage::HandshakeAck {
            accepted: true,
            reason: None,
        },
        ProtocolMessage::DataChunk {
            sequence: 42,
            data: vec![1, 2, 3, 4, 5],
        },
        ProtocolMessage::TransferComplete {
            checksum: "def456".to_string(),
        },
        ProtocolMessage::Error {
            code: "ERR001".to_string(),
            message: "Test error".to_string(),
        },
    ];
    
    for message in messages {
        // Test that messages can be serialized and deserialized
        let serialized = serde_json::to_vec(&message).unwrap();
        let deserialized: ProtocolMessage = serde_json::from_slice(&serialized).unwrap();
        
        // Compare the original and deserialized messages
        let original_json = serde_json::to_string(&message).unwrap();
        let deserialized_json = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(original_json, deserialized_json);
    }
}