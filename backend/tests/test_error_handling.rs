// Simple test for error handling
use file_transfer_backend::errors::TransferError;

#[tokio::test]
async fn test_error_creation_and_properties() {
    // Test 1: FileNotFound error
    let error = TransferError::FileNotFound {
        path: "/non/existent/file.txt".to_string(),
    };
    
    assert_eq!(error.error_code(), "FILE_NOT_FOUND");
    assert!(!error.is_recoverable());
    assert_eq!(error.get_context(), Some("/non/existent/file.txt".to_string()));
    
    // Test 2: NetworkError
    let network_error = TransferError::NetworkError {
        message: "Connection timeout".to_string(),
        context: Some("192.168.1.1:8080".to_string()),
        recoverable: true,
    };
    
    assert_eq!(network_error.error_code(), "NETWORK_ERROR");
    assert!(network_error.is_recoverable());
    assert_eq!(network_error.get_context(), Some("192.168.1.1:8080".to_string()));
    
    // Test 3: ConfigError
    let config_error = TransferError::ConfigError {
        message: "Invalid port number".to_string(),
        field: Some("port".to_string()),
    };
    
    assert_eq!(config_error.error_code(), "CONFIG_ERROR");
    assert!(!config_error.is_recoverable());
    assert_eq!(config_error.get_context(), Some("port".to_string()));
}

#[tokio::test]
async fn test_error_conversion_from_io_error() {
    use std::io::{Error, ErrorKind};
    
    // Test conversion from std::io::Error
    let io_error = Error::new(ErrorKind::NotFound, "File not found");
    let transfer_error: TransferError = io_error.into();
    
    match transfer_error {
        TransferError::FileNotFound { .. } => {
            // Expected
        }
        _ => panic!("Expected FileNotFound error"),
    }
}

#[tokio::test]
async fn test_error_context_modification() {
    let mut error = TransferError::NetworkError {
        message: "Connection failed".to_string(),
        context: None,
        recoverable: true,
    };
    
    error = error.with_context("127.0.0.1:8080".to_string());
    assert_eq!(error.get_context(), Some("127.0.0.1:8080".to_string()));
}