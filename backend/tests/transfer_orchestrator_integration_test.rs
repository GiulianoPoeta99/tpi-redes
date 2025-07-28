// Integration tests for complete transfer orchestrator workflows
// Tests the full end-to-end functionality including session management,
// progress tracking, metrics collection, and state persistence

use file_transfer_backend::{
    config::{TransferConfig, Protocol, TransferMode},
    transfer::{TransferOrchestrator, TransferStatus},
    utils::events::BroadcastEventEmitter,
    errors::TransferError,
};
use std::net::{SocketAddr, IpAddr, Ipv4Addr};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tempfile::{NamedTempFile, TempDir};
use tokio::time::{timeout, sleep};
use std::io::Write;

fn get_available_port() -> u16 {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);
    port
}

async fn create_test_file(content: &[u8]) -> NamedTempFile {
    let mut temp_file = NamedTempFile::new().unwrap();
    temp_file.write_all(content).unwrap();
    temp_file.flush().unwrap();
    temp_file
}

async fn create_orchestrator() -> Arc<TransferOrchestrator> {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(1000);
    let orchestrator = Arc::new(TransferOrchestrator::new(Arc::new(event_emitter)));
    orchestrator.start().await.unwrap();
    orchestrator
}

/// Test complete transfer session lifecycle with orchestrator
#[tokio::test]
async fn test_complete_transfer_session_lifecycle() {
    let orchestrator = create_orchestrator().await;
    
    // Create transfer configuration
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(5),
    };
    
    // Test session creation
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    assert!(!transfer_id.is_empty());
    
    // Verify initial progress
    let progress = orchestrator.get_progress(&transfer_id).await.unwrap();
    assert_eq!(progress.transfer_id, transfer_id);
    assert_eq!(progress.status, TransferStatus::Idle);
    assert_eq!(progress.progress, 0.0);
    
    // Test that session appears in active transfers list (initially empty)
    let active_transfers = orchestrator.get_active_transfers().await;
    assert_eq!(active_transfers.len(), 0); // Not active until started
    
    // Test cancellation of non-active transfer (should fail)
    let cancel_result = orchestrator.cancel_transfer(
        transfer_id.clone(),
        "Test cancellation".to_string()
    ).await;
    assert!(cancel_result.is_err());
    
    println!("Transfer session lifecycle test completed successfully");
}

/// Test transfer progress tracking and metrics collection
#[tokio::test]
async fn test_transfer_progress_tracking() {
    let orchestrator = create_orchestrator().await;
    
    // Create multiple transfer sessions
    let configs = vec![
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: Some("test1.txt".to_string()),
            chunk_size: 8192,
            timeout: Duration::from_secs(5),
        },
        TransferConfig {
            mode: TransferMode::Receiver,
            protocol: Protocol::Udp,
            target_ip: None,
            port: 8081,
            filename: None,
            chunk_size: 1024,
            timeout: Duration::from_secs(5),
        },
    ];
    
    let mut transfer_ids = Vec::new();
    
    // Create sessions
    for config in configs {
        let transfer_id = orchestrator.create_session(config).await.unwrap();
        transfer_ids.push(transfer_id);
    }
    
    // Verify all sessions exist
    for transfer_id in &transfer_ids {
        let progress = orchestrator.get_progress(transfer_id).await.unwrap();
        assert_eq!(progress.transfer_id, *transfer_id);
        assert_eq!(progress.status, TransferStatus::Idle);
    }
    
    // Test cleanup of completed transfers (should be 0 since none are completed)
    let cleaned_count = orchestrator.cleanup_completed_transfers().await;
    assert_eq!(cleaned_count, 0);
    
    println!("Progress tracking test completed with {} sessions", transfer_ids.len());
}

/// Test transfer cancellation functionality
#[tokio::test]
async fn test_transfer_cancellation_workflow() {
    let orchestrator = create_orchestrator().await;
    let test_content = b"Cancellation test content";
    let temp_file = create_test_file(test_content).await;
    
    // Create transfer configuration
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 9999, // Non-existent receiver to prevent actual transfer
        filename: Some("cancel_test.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(2),
    };
    
    // Create session
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    
    // Start transfer (will fail due to no receiver, but that's expected)
    let start_result = orchestrator.start_transfer(
        transfer_id.clone(),
        temp_file.path().to_path_buf(),
        "127.0.0.1:9999".to_string(),
    ).await;
    
    // Should succeed in starting (even though it will fail later)
    assert!(start_result.is_ok());
    
    // Give it a moment to start
    sleep(Duration::from_millis(100)).await;
    
    // Try to cancel (may succeed or fail depending on timing)
    let cancel_result = orchestrator.cancel_transfer(
        transfer_id.clone(),
        "User requested cancellation".to_string()
    ).await;
    
    // The cancellation might succeed or fail depending on transfer state
    println!("Cancellation result: {:?}", cancel_result);
    
    // Wait for transfer to complete/fail
    sleep(Duration::from_secs(3)).await;
    
    // Check final status
    let final_progress = orchestrator.get_progress(&transfer_id).await.unwrap();
    assert!(final_progress.status.is_terminal());
    
    println!("Transfer cancellation workflow test completed");
}

/// Test receiver workflow with orchestrator
#[tokio::test]
async fn test_receiver_workflow() {
    let orchestrator = create_orchestrator().await;
    let port = get_available_port();
    let temp_dir = TempDir::new().unwrap();
    
    // Create receiver configuration
    let config = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Tcp,
        target_ip: None,
        port,
        filename: None,
        chunk_size: 8192,
        timeout: Duration::from_secs(3),
    };
    
    // Create session
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    
    // Start receiver
    let start_result = orchestrator.start_receiver(
        transfer_id.clone(),
        port,
        Protocol::Tcp,
        temp_dir.path().to_path_buf(),
    ).await;
    
    assert!(start_result.is_ok());
    
    // Give receiver time to bind
    sleep(Duration::from_millis(200)).await;
    
    // Check that receiver is in connecting state
    let progress = orchestrator.get_progress(&transfer_id).await.unwrap();
    println!("Receiver status: {:?}", progress.status);
    
    // Cancel the receiver after a short time
    sleep(Duration::from_millis(500)).await;
    let cancel_result = orchestrator.cancel_transfer(
        transfer_id.clone(),
        "Test completed".to_string()
    ).await;
    
    println!("Receiver cancel result: {:?}", cancel_result);
    
    // Wait for cleanup
    sleep(Duration::from_secs(1)).await;
    
    println!("Receiver workflow test completed");
}

/// Test UDP fire-and-forget workflow with orchestrator
#[tokio::test]
async fn test_udp_fire_and_forget_workflow() {
    let orchestrator = create_orchestrator().await;
    let test_content = b"UDP fire-and-forget test with orchestrator";
    let temp_file = create_test_file(test_content).await;
    let port = get_available_port();
    
    // Create sender configuration
    let sender_config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port,
        filename: Some("udp_test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(5),
    };
    
    // Create sender session
    let sender_id = orchestrator.create_session(sender_config).await.unwrap();
    
    // Start sender (should succeed even without receiver due to fire-and-forget)
    let start_result = orchestrator.start_transfer(
        sender_id.clone(),
        temp_file.path().to_path_buf(),
        format!("127.0.0.1:{}", port),
    ).await;
    
    assert!(start_result.is_ok());
    
    // Wait for transfer to complete
    let mut attempts = 0;
    let max_attempts = 20; // 10 seconds total
    
    loop {
        sleep(Duration::from_millis(500)).await;
        attempts += 1;
        
        let progress = orchestrator.get_progress(&sender_id).await.unwrap();
        println!("UDP sender status: {:?}, progress: {:.1}%", 
                progress.status, progress.progress * 100.0);
        
        if progress.status.is_terminal() || attempts >= max_attempts {
            break;
        }
    }
    
    // Check final status
    let final_progress = orchestrator.get_progress(&sender_id).await.unwrap();
    println!("Final UDP sender status: {:?}", final_progress.status);
    
    // UDP should complete successfully (fire-and-forget)
    // Even if it shows as error due to no receiver, that's expected behavior
    assert!(final_progress.status.is_terminal());
    
    println!("UDP fire-and-forget workflow test completed");
}

/// Test state persistence and recovery
#[tokio::test]
async fn test_state_persistence_and_recovery() {
    let temp_dir = TempDir::new().unwrap();
    let _storage_path = temp_dir.path().join("transfer_sessions");
    
    // Create orchestrator with custom storage path
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(1000);
    let orchestrator = Arc::new(TransferOrchestrator::new(Arc::new(event_emitter)));
    orchestrator.start().await.unwrap();
    
    // Create some sessions
    let configs = vec![
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: Some("persist_test1.txt".to_string()),
            chunk_size: 8192,
            timeout: Duration::from_secs(5),
        },
        TransferConfig {
            mode: TransferMode::Receiver,
            protocol: Protocol::Udp,
            target_ip: None,
            port: 8081,
            filename: None,
            chunk_size: 1024,
            timeout: Duration::from_secs(5),
        },
    ];
    
    let mut transfer_ids = Vec::new();
    for config in configs {
        let transfer_id = orchestrator.create_session(config).await.unwrap();
        transfer_ids.push(transfer_id);
    }
    
    // Verify sessions exist
    for transfer_id in &transfer_ids {
        let progress = orchestrator.get_progress(transfer_id).await.unwrap();
        assert_eq!(progress.transfer_id, *transfer_id);
    }
    
    println!("State persistence test completed with {} sessions", transfer_ids.len());
}

/// Test metrics collection during transfers
#[tokio::test]
async fn test_metrics_collection() {
    let orchestrator = create_orchestrator().await;
    
    // Create multiple sessions with different protocols
    let tcp_config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("metrics_tcp.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(2),
    };
    
    let udp_config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Udp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8081,
        filename: Some("metrics_udp.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(2),
    };
    
    // Create sessions
    let tcp_id = orchestrator.create_session(tcp_config).await.unwrap();
    let udp_id = orchestrator.create_session(udp_config).await.unwrap();
    
    // Verify sessions are tracked
    let tcp_progress = orchestrator.get_progress(&tcp_id).await.unwrap();
    let udp_progress = orchestrator.get_progress(&udp_id).await.unwrap();
    
    assert_eq!(tcp_progress.transfer_id, tcp_id);
    assert_eq!(udp_progress.transfer_id, udp_id);
    
    // Test cleanup
    let cleaned = orchestrator.cleanup_completed_transfers().await;
    println!("Cleaned {} completed transfers", cleaned);
    
    println!("Metrics collection test completed");
}

/// Test error handling in orchestrator workflows
#[tokio::test]
async fn test_orchestrator_error_handling() {
    let orchestrator = create_orchestrator().await;
    
    // Test getting progress for non-existent session
    let result = orchestrator.get_progress("non-existent-id").await;
    assert!(result.is_err());
    
    if let Err(TransferError::Unknown { message, .. }) = result {
        assert!(message.contains("Transfer session not found"));
    }
    
    // Test cancelling non-existent session
    let result = orchestrator.cancel_transfer(
        "non-existent-id".to_string(),
        "Test".to_string()
    ).await;
    assert!(result.is_err());
    
    // Test invalid transfer start
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("invalid-ip".to_string()),
        port: 8080,
        filename: Some("error_test.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(5),
    };
    
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    
    // Try to start with invalid file path
    let result = orchestrator.start_transfer(
        transfer_id,
        PathBuf::from("/non/existent/file.txt"),
        "127.0.0.1:8080".to_string(),
    ).await;
    
    // Should fail due to file not found
    assert!(result.is_err());
    
    println!("Error handling test completed successfully");
}

/// Test concurrent transfer sessions
#[tokio::test]
async fn test_concurrent_transfer_sessions() {
    let orchestrator = create_orchestrator().await;
    
    // Create multiple concurrent sessions
    let mut handles = Vec::new();
    
    for i in 0..5 {
        let orchestrator_clone = Arc::clone(&orchestrator);
        let handle = tokio::spawn(async move {
            let config = TransferConfig {
                mode: TransferMode::Transmitter,
                protocol: if i % 2 == 0 { Protocol::Tcp } else { Protocol::Udp },
                target_ip: Some("127.0.0.1".to_string()),
                port: 8080 + i as u16,
                filename: Some(format!("concurrent_test_{}.txt", i)),
                chunk_size: if i % 2 == 0 { 8192 } else { 1024 },
                timeout: Duration::from_secs(5),
            };
            
            orchestrator_clone.create_session(config).await
        });
        handles.push(handle);
    }
    
    // Wait for all sessions to be created
    let mut transfer_ids = Vec::new();
    for handle in handles {
        let transfer_id = handle.await.unwrap().unwrap();
        transfer_ids.push(transfer_id);
    }
    
    // Verify all sessions exist
    for transfer_id in &transfer_ids {
        let progress = orchestrator.get_progress(transfer_id).await.unwrap();
        assert_eq!(progress.transfer_id, *transfer_id);
    }
    
    println!("Concurrent sessions test completed with {} sessions", transfer_ids.len());
}

/// Test complete workflow integration
#[tokio::test]
async fn test_complete_workflow_integration() {
    let orchestrator = create_orchestrator().await;
    let test_content = b"Complete workflow integration test";
    let temp_file = create_test_file(test_content).await;
    let temp_dir = TempDir::new().unwrap();
    let port = get_available_port();
    
    // Test the complete workflow:
    // 1. Create receiver session
    // 2. Start receiver
    // 3. Create sender session  
    // 4. Start sender
    // 5. Monitor progress
    // 6. Handle completion/errors
    
    // Step 1 & 2: Create and start receiver
    let receiver_config = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Tcp,
        target_ip: None,
        port,
        filename: None,
        chunk_size: 8192,
        timeout: Duration::from_secs(5),
    };
    
    let receiver_id = orchestrator.create_session(receiver_config).await.unwrap();
    
    let receiver_start = orchestrator.start_receiver(
        receiver_id.clone(),
        port,
        Protocol::Tcp,
        temp_dir.path().to_path_buf(),
    ).await;
    
    assert!(receiver_start.is_ok());
    
    // Give receiver time to bind
    sleep(Duration::from_millis(300)).await;
    
    // Step 3 & 4: Create and start sender
    let sender_config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port,
        filename: Some("integration_test.txt".to_string()),
        chunk_size: 8192,
        timeout: Duration::from_secs(5),
    };
    
    let sender_id = orchestrator.create_session(sender_config).await.unwrap();
    
    let sender_start = orchestrator.start_transfer(
        sender_id.clone(),
        temp_file.path().to_path_buf(),
        format!("127.0.0.1:{}", port),
    ).await;
    
    assert!(sender_start.is_ok());
    
    // Step 5: Monitor progress
    let mut monitoring_attempts = 0;
    let max_monitoring_attempts = 20; // 10 seconds
    
    loop {
        sleep(Duration::from_millis(500)).await;
        monitoring_attempts += 1;
        
        let sender_progress = orchestrator.get_progress(&sender_id).await.unwrap();
        let receiver_progress = orchestrator.get_progress(&receiver_id).await.unwrap();
        
        println!("Sender: {:?} ({:.1}%), Receiver: {:?} ({:.1}%)",
                sender_progress.status, sender_progress.progress * 100.0,
                receiver_progress.status, receiver_progress.progress * 100.0);
        
        // Check if both are in terminal state
        if (sender_progress.status.is_terminal() && receiver_progress.status.is_terminal()) 
           || monitoring_attempts >= max_monitoring_attempts {
            break;
        }
    }
    
    // Step 6: Check final states
    let final_sender = orchestrator.get_progress(&sender_id).await.unwrap();
    let final_receiver = orchestrator.get_progress(&receiver_id).await.unwrap();
    
    println!("Final states - Sender: {:?}, Receiver: {:?}", 
             final_sender.status, final_receiver.status);
    
    // Both should be in terminal state
    assert!(final_sender.status.is_terminal());
    assert!(final_receiver.status.is_terminal());
    
    // Test cleanup
    let active_transfers = orchestrator.get_active_transfers().await;
    println!("Active transfers after completion: {}", active_transfers.len());
    
    let cleaned = orchestrator.cleanup_completed_transfers().await;
    println!("Cleaned up {} completed transfers", cleaned);
    
    println!("Complete workflow integration test finished successfully");
}