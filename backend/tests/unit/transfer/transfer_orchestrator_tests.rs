use crate::config::{TransferConfig, Protocol, TransferMode};
use crate::transfer::transfer_orchestrator::{TransferOrchestrator, TransferSession};
use crate::utils::events::BroadcastEventEmitter;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

#[tokio::test]
async fn test_orchestrator_creation() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    
    // Test that we can start the orchestrator
    let result = orchestrator.start().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_session_creation() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    orchestrator.start().await.unwrap();
    
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    assert!(!transfer_id.is_empty());
    
    // Verify session exists
    let progress = orchestrator.get_progress(&transfer_id).await.unwrap();
    assert_eq!(progress.transfer_id, transfer_id);
}

#[tokio::test]
async fn test_session_cancellation() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    orchestrator.start().await.unwrap();
    
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    
    // Try to cancel a non-active transfer (should fail)
    let result = orchestrator.cancel_transfer(
        transfer_id.clone(),
        "Test cancellation".to_string()
    ).await;
    assert!(result.is_err()); // Should fail because transfer is not active
}

#[tokio::test]
async fn test_active_transfers_tracking() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    orchestrator.start().await.unwrap();
    
    // Initially no active transfers
    let active = orchestrator.get_active_transfers().await;
    assert_eq!(active.len(), 0);
    
    // Create a session
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let _transfer_id = orchestrator.create_session(config).await.unwrap();
    
    // Still no active transfers (session created but not started)
    let active = orchestrator.get_active_transfers().await;
    assert_eq!(active.len(), 0);
}

#[tokio::test]
async fn test_cleanup_completed_transfers() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    orchestrator.start().await.unwrap();
    
    // Create multiple sessions
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    for _ in 0..5 {
        let _transfer_id = orchestrator.create_session(config.clone()).await.unwrap();
    }
    
    // Test cleanup (should not remove anything since sessions are not completed)
    let removed = orchestrator.cleanup_completed_transfers().await;
    assert_eq!(removed, 0);
}

#[tokio::test]
async fn test_transfer_session_lifecycle() {
    let mut session = TransferSession::new(
        "test-id".to_string(),
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: Some("test.txt".to_string()),
            chunk_size: 1024,
            timeout: Duration::from_secs(30),
        }
    );
    
    // Initial state
    assert!(!session.is_active());
    assert!(!session.is_terminal());
    
    // Start session
    session.start(
        Some(PathBuf::from("test.txt")),
        Some("127.0.0.1:8080".to_string()),
        1000
    );
    assert!(session.is_active());
    
    // Update progress
    session.update_progress(500, 100.0, 5);
    assert_eq!(session.bytes_transferred, 500);
    assert_eq!(session.progress.speed, 100.0);
    
    // Complete session
    session.complete("checksum123".to_string());
    assert!(session.is_terminal());
    assert!(!session.is_active());
    assert_eq!(session.checksum, Some("checksum123".to_string()));
    
    // Test duration calculation
    let duration = session.duration();
    assert!(duration.is_some());
}

#[tokio::test]
async fn test_transfer_session_failure() {
    let mut session = TransferSession::new(
        "test-id".to_string(),
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: Some("test.txt".to_string()),
            chunk_size: 1024,
            timeout: Duration::from_secs(30),
        }
    );
    
    // Start and fail session
    session.start(
        Some(PathBuf::from("test.txt")),
        Some("127.0.0.1:8080".to_string()),
        1000
    );
    
    session.fail("Test error".to_string());
    assert!(session.is_terminal());
    assert!(!session.is_active());
    assert_eq!(session.error, Some("Test error".to_string()));
}

#[tokio::test]
async fn test_transfer_session_cancellation() {
    let mut session = TransferSession::new(
        "test-id".to_string(),
        TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: Some("test.txt".to_string()),
            chunk_size: 1024,
            timeout: Duration::from_secs(30),
        }
    );
    
    // Start and cancel session
    session.start(
        Some(PathBuf::from("test.txt")),
        Some("127.0.0.1:8080".to_string()),
        1000
    );
    
    session.cancel("User cancelled".to_string());
    assert!(session.is_terminal());
    assert!(!session.is_active());
    assert!(session.error.as_ref().unwrap().contains("Cancelled: User cancelled"));
}

#[tokio::test]
async fn test_invalid_session_operations() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    orchestrator.start().await.unwrap();
    
    // Test getting progress for non-existent session
    let result = orchestrator.get_progress("non-existent").await;
    assert!(result.is_err());
    
    // Test cancelling non-existent session
    let result = orchestrator.cancel_transfer(
        "non-existent".to_string(),
        "Test".to_string()
    ).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_receiver_session_creation() {
    let (event_emitter, _receiver) = BroadcastEventEmitter::new(100);
    let orchestrator = TransferOrchestrator::new(Arc::new(event_emitter));
    orchestrator.start().await.unwrap();
    
    let config = TransferConfig {
        mode: TransferMode::Receiver,
        protocol: Protocol::Tcp,
        target_ip: None,
        port: 8081,
        filename: None,
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    let transfer_id = orchestrator.create_session(config).await.unwrap();
    assert!(!transfer_id.is_empty());
    
    // Verify session exists and is in receiver mode
    let progress = orchestrator.get_progress(&transfer_id).await.unwrap();
    assert_eq!(progress.transfer_id, transfer_id);
}