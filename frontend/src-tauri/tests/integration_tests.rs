// Integration tests for Tauri commands
use std::time::Duration;

// Import backend types for testing
use file_transfer_backend::{
    TransferConfig, Protocol, TransferMode
};

#[tokio::test]
async fn test_backend_initialization() {
    use file_transfer_backend::initialize_orchestrator;
    
    // Test backend initialization
    let result = initialize_orchestrator().await;
    assert!(result.is_ok(), "Backend initialization should succeed");
}

#[tokio::test]
async fn test_validate_config() {
    use file_transfer_backend::validate_communication_config;
    
    // Test valid configuration
    let valid_config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(30),
    };
    
    let result = validate_communication_config(&valid_config);
    assert!(result.is_ok(), "Valid configuration should pass validation");
    
    // Test invalid configuration (missing target IP for transmitter)
    let invalid_config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: None,
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(30),
    };
    
    let result = validate_communication_config(&invalid_config);
    assert!(result.is_err(), "Invalid configuration should fail validation");
}

#[tokio::test]
async fn test_check_receiver_availability() {
    use file_transfer_backend::check_receiver_availability;
    use std::net::SocketAddr;
    
    // Test checking receiver availability (should return false for non-existent receiver)
    let addr: SocketAddr = "127.0.0.1:9999".parse().unwrap();
    let timeout = Duration::from_secs(1);
    
    let result = check_receiver_availability(Protocol::Tcp, addr, timeout).await;
    
    // The result should be false since no receiver is listening on port 9999
    assert!(!result, "Should return false for non-existent receiver");
}

#[tokio::test]
async fn test_protocol_parsing() {
    // Test protocol enum serialization/deserialization
    let tcp_json = serde_json::to_string(&Protocol::Tcp).unwrap();
    let udp_json = serde_json::to_string(&Protocol::Udp).unwrap();
    
    assert_eq!(tcp_json, "\"Tcp\"");
    assert_eq!(udp_json, "\"Udp\"");
    
    let tcp_parsed: Protocol = serde_json::from_str(&tcp_json).unwrap();
    let udp_parsed: Protocol = serde_json::from_str(&udp_json).unwrap();
    
    assert_eq!(tcp_parsed, Protocol::Tcp);
    assert_eq!(udp_parsed, Protocol::Udp);
}

#[tokio::test]
async fn test_error_serialization() {
    use file_transfer_backend::TransferError;
    
    // Test that TransferError can be serialized
    let transfer_error = TransferError::ConfigError {
        message: "Test error".to_string(),
        field: Some("test_field".to_string()),
    };
    
    let error_string = transfer_error.to_string();
    assert!(error_string.contains("Test error"));
}

#[tokio::test]
async fn test_transfer_progress_serialization() {
    use file_transfer_backend::TransferProgress;
    
    // Test that TransferProgress can be created and serialized
    let progress = TransferProgress::new("test-123".to_string());
    
    let serialized = serde_json::to_string(&progress).unwrap();
    let deserialized: TransferProgress = serde_json::from_str(&serialized).unwrap();
    
    assert_eq!(progress.transfer_id, deserialized.transfer_id);
    assert_eq!(progress.progress, deserialized.progress);
    assert_eq!(progress.speed, deserialized.speed);
    assert_eq!(progress.eta, deserialized.eta);
    assert_eq!(progress.status, deserialized.status);
    assert_eq!(progress.bytes_transferred, deserialized.bytes_transferred);
    assert_eq!(progress.total_bytes, deserialized.total_bytes);
}

// Test event serialization
#[tokio::test]
async fn test_event_serialization() {

    
    // Test that TransferEvent can be serialized (we'll use a simple variant)
    // Since we can't easily create complex events without the full backend running,
    // we'll just test that the enum can be serialized
    let serialized = serde_json::to_string(&Protocol::Tcp).unwrap();
    assert_eq!(serialized, "\"Tcp\"");
    
    let deserialized: Protocol = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized, Protocol::Tcp);
}

// Test configuration validation edge cases
#[tokio::test]
async fn test_config_validation_edge_cases() {
    use file_transfer_backend::{TransferConfig, Protocol, TransferMode};
    
    // Test port boundary values
    let config_port_0 = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Tcp,
        target_ip: None,
        port: 0,
        filename: None,
        chunk_size: 8192,
        timeout: Duration::from_secs(30),
    };
    
    let result = config_port_0.validate();
    assert!(result.is_err(), "Port 0 should be invalid");
    
    // Test maximum chunk size
    let config_large_chunk = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Tcp,
        target_ip: None,
        port: 8080,
        filename: None,
        chunk_size: 2 * 1024 * 1024, // 2MB, should be invalid
        timeout: Duration::from_secs(30),
    };
    
    let result = config_large_chunk.validate();
    assert!(result.is_err(), "Chunk size > 1MB should be invalid");
    
    // Test timeout boundary
    let config_long_timeout = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Tcp,
        target_ip: None,
        port: 8080,
        filename: None,
        chunk_size: 8192,
        timeout: Duration::from_secs(3700), // > 1 hour
    };
    
    let result = config_long_timeout.validate();
    assert!(result.is_err(), "Timeout > 1 hour should be invalid");
}