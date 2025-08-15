// Complete Transfer Workflow Tests
// Tests end-to-end file transfer scenarios

use crate::e2e::{TestEnvironment, TestFileGenerator, NetworkUtils, TransferTestUtils, TestResult, PerformanceUtils};
use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    core::transfer::CommunicationManager,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::time::Duration;
use tokio::time::timeout;

/// Test complete TCP file transfer workflow
pub async fn test_tcp_complete_workflow() -> TestResult {
    let mut result = TestResult::new("TCP Complete Workflow".to_string());
    
    let env = TestEnvironment::new().await;
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Create test file
    let test_file = env.test_files_dir.join("tcp_test.txt");
    if let Err(e) = TestFileGenerator::create_text_file(&test_file, 10 * 1024).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    // Configure receiver and sender
    let receiver_config = TransferTestUtils::create_tcp_config(
        TransferMode::Receiver, port, None
    );
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    // Start receiver in background
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    // Wait for receiver to bind
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Measure transfer performance
    let (duration, sender_result) = PerformanceUtils::measure_transfer(|| async {
        timeout(
            Duration::from_secs(30),
            CommunicationManager::start_sender(&sender_config, test_file.clone(), bind_addr)
        ).await
    }).await;
    
    // Clean up receiver
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) => {
            if transfer_result.success {
                // Verify file integrity
                let received_file = env.downloads_dir.join("tcp_test.txt");
                if received_file.exists() {
                    match TransferTestUtils::verify_file_integrity(&test_file, &received_file).await {
                        Ok(true) => {
                            result
                                .with_success(true)
                                .with_duration(duration)
                                .with_bytes_transferred(transfer_result.bytes_transferred)
                                .add_metadata("protocol".to_string(), "TCP".to_string())
                                .add_metadata("file_size".to_string(), "10KB".to_string())
                        }
                        Ok(false) => result.with_error("File integrity check failed".to_string()),
                        Err(e) => result.with_error(format!("Failed to verify file integrity: {}", e)),
                    }
                } else {
                    result.with_error("Received file not found".to_string())
                }
            } else {
                result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
            }
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test complete UDP file transfer workflow
pub async fn test_udp_complete_workflow() -> TestResult {
    let mut result = TestResult::new("UDP Complete Workflow".to_string());
    
    let env = TestEnvironment::new().await;
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Create test file
    let test_file = env.test_files_dir.join("udp_test.txt");
    if let Err(e) = TestFileGenerator::create_text_file(&test_file, 5 * 1024).await {
        return result.with_error(format!("Failed to create test file: {}", e));
    }
    
    // Configure receiver and sender
    let receiver_config = TransferTestUtils::create_udp_config(
        TransferMode::Receiver, port, None
    );
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    // Start receiver in background
    let receiver_output_dir = env.downloads_dir.clone();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    // Wait for receiver to bind
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    // Measure transfer performance
    let (duration, sender_result) = PerformanceUtils::measure_transfer(|| async {
        timeout(
            Duration::from_secs(30),
            CommunicationManager::start_sender(&sender_config, test_file.clone(), bind_addr)
        ).await
    }).await;
    
    // Wait for receiver to complete or timeout
    let receiver_result = timeout(Duration::from_secs(35), receiver_task).await;
    
    match sender_result {
        Ok(Ok(transfer_result)) => {
            if transfer_result.success {
                result = result
                    .with_success(true)
                    .with_duration(duration)
                    .with_bytes_transferred(transfer_result.bytes_transferred)
                    .add_metadata("protocol".to_string(), "UDP".to_string())
                    .add_metadata("file_size".to_string(), "5KB".to_string());
                
                // For UDP, receiver may or may not complete successfully
                if let Ok(Ok(Ok(recv_result))) = receiver_result {
                    if recv_result.success {
                        result = result.add_metadata("receiver_status".to_string(), "completed".to_string());
                        
                        // Verify file integrity if received
                        let received_file = env.downloads_dir.join("udp_test.txt");
                        if received_file.exists() {
                            match TransferTestUtils::verify_file_integrity(&test_file, &received_file).await {
                                Ok(true) => {
                                    result = result.add_metadata("integrity_check".to_string(), "passed".to_string());
                                }
                                Ok(false) => {
                                    result = result.add_metadata("integrity_check".to_string(), "failed".to_string());
                                }
                                Err(_) => {
                                    result = result.add_metadata("integrity_check".to_string(), "error".to_string());
                                }
                            }
                        }
                    }
                } else {
                    result = result.add_metadata("receiver_status".to_string(), "timeout_or_failed".to_string());
                }
                
                result
            } else {
                result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
            }
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test multiple file sizes
pub async fn test_multiple_file_sizes() -> Vec<TestResult> {
    let mut results = Vec::new();
    let env = TestEnvironment::new().await;
    
    // Create test files of different sizes
    let test_files = match TestFileGenerator::create_test_suite(&env.test_files_dir).await {
        Ok(files) => files,
        Err(e) => {
            results.push(TestResult::new("Multiple File Sizes".to_string())
                .with_error(format!("Failed to create test files: {}", e)));
            return results;
        }
    };
    
    for test_file in test_files {
        let file_name = test_file.file_name().unwrap().to_string_lossy();
        let file_size = tokio::fs::metadata(&test_file).await.unwrap().len();
        
        // Test with TCP
        let tcp_result = test_file_transfer_tcp(&test_file, &env.downloads_dir, &file_name).await;
        results.push(tcp_result.add_metadata("file_size_bytes".to_string(), file_size.to_string()));
        
        // Test with UDP for smaller files only (< 1MB to avoid timeout issues)
        if file_size < 1024 * 1024 {
            let udp_result = test_file_transfer_udp(&test_file, &env.downloads_dir, &file_name).await;
            results.push(udp_result.add_metadata("file_size_bytes".to_string(), file_size.to_string()));
        }
    }
    
    results
}

async fn test_file_transfer_tcp(
    test_file: &std::path::Path,
    output_dir: &std::path::Path,
    file_name: &str,
) -> TestResult {
    let mut result = TestResult::new(format!("TCP Transfer - {}", file_name));
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_tcp_config(
        TransferMode::Receiver, port, None
    );
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let receiver_output_dir = output_dir.to_path_buf();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    let (duration, sender_result) = PerformanceUtils::measure_transfer(|| async {
        timeout(
            Duration::from_secs(60),
            CommunicationManager::start_sender(&sender_config, test_file.to_path_buf(), bind_addr)
        ).await
    }).await;
    
    receiver_task.abort();
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            result
                .with_success(true)
                .with_duration(duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "TCP".to_string())
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

async fn test_file_transfer_udp(
    test_file: &std::path::Path,
    output_dir: &std::path::Path,
    file_name: &str,
) -> TestResult {
    let mut result = TestResult::new(format!("UDP Transfer - {}", file_name));
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let receiver_config = TransferTestUtils::create_udp_config(
        TransferMode::Receiver, port, None
    );
    let sender_config = TransferTestUtils::create_udp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let receiver_output_dir = output_dir.to_path_buf();
    let receiver_task = tokio::spawn(async move {
        CommunicationManager::start_receiver(&receiver_config, bind_addr, receiver_output_dir).await
    });
    
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    let (duration, sender_result) = PerformanceUtils::measure_transfer(|| async {
        timeout(
            Duration::from_secs(30),
            CommunicationManager::start_sender(&sender_config, test_file.to_path_buf(), bind_addr)
        ).await
    }).await;
    
    let _receiver_result = timeout(Duration::from_secs(35), receiver_task).await;
    
    match sender_result {
        Ok(Ok(transfer_result)) if transfer_result.success => {
            result
                .with_success(true)
                .with_duration(duration)
                .with_bytes_transferred(transfer_result.bytes_transferred)
                .add_metadata("protocol".to_string(), "UDP".to_string())
        }
        Ok(Ok(transfer_result)) => {
            result.with_error(transfer_result.error.unwrap_or("Transfer failed".to_string()))
        }
        Ok(Err(e)) => result.with_error(format!("Transfer error: {}", e)),
        Err(_) => result.with_error("Transfer timed out".to_string()),
    }
}

/// Test error scenarios
pub async fn test_error_scenarios() -> Vec<TestResult> {
    let mut results = Vec::new();
    
    // Test 1: TCP sender without receiver
    results.push(test_tcp_no_receiver().await);
    
    // Test 2: Invalid file path
    results.push(test_invalid_file_path().await);
    
    // Test 3: Port already in use
    results.push(test_port_in_use().await);
    
    results
}

async fn test_tcp_no_receiver() -> TestResult {
    let mut result = TestResult::new("TCP No Receiver Error".to_string());
    
    let env = TestEnvironment::new().await;
    let test_file = env.test_files_dir.join("error_test.txt");
    TestFileGenerator::create_text_file(&test_file, 1024).await.unwrap();
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let sender_result = CommunicationManager::start_sender(&sender_config, test_file, bind_addr).await;
    
    match sender_result {
        Err(_) => result.with_success(true).add_metadata("expected_error".to_string(), "connection_refused".to_string()),
        Ok(_) => result.with_error("Expected connection error but transfer succeeded".to_string()),
    }
}

async fn test_invalid_file_path() -> TestResult {
    let mut result = TestResult::new("Invalid File Path Error".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    let sender_config = TransferTestUtils::create_tcp_config(
        TransferMode::Transmitter, port, Some("127.0.0.1".to_string())
    );
    
    let invalid_file = std::path::PathBuf::from("/nonexistent/file.txt");
    let sender_result = CommunicationManager::start_sender(&sender_config, invalid_file, bind_addr).await;
    
    match sender_result {
        Err(_) => result.with_success(true).add_metadata("expected_error".to_string(), "file_not_found".to_string()),
        Ok(_) => result.with_error("Expected file error but transfer succeeded".to_string()),
    }
}

async fn test_port_in_use() -> TestResult {
    let mut result = TestResult::new("Port In Use Error".to_string());
    
    let port = NetworkUtils::get_available_port();
    let bind_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    
    // Bind to the port first
    let _listener = tokio::net::TcpListener::bind(bind_addr).await.unwrap();
    
    let receiver_config = TransferTestUtils::create_tcp_config(
        TransferMode::Receiver, port, None
    );
    
    let temp_dir = tempfile::TempDir::new().unwrap();
    let receiver_result = CommunicationManager::start_receiver(
        &receiver_config, 
        bind_addr, 
        temp_dir.path().to_path_buf()
    ).await;
    
    match receiver_result {
        Err(_) => result.with_success(true).add_metadata("expected_error".to_string(), "address_in_use".to_string()),
        Ok(_) => result.with_error("Expected port binding error but receiver started successfully".to_string()),
    }
}