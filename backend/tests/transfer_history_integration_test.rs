use file_transfer_backend::core::transfer::{
    TransferHistoryManager, TransferHistoryRecord, HistoryTransferMode, TransferHistoryStatus, 
    HistoryFilter, create_history_record, NetworkLogEntry, LogLevel, LogCategory
};
use file_transfer_backend::config::Protocol;
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Duration;
use tempfile::TempDir;
use tokio;

#[tokio::test]
async fn test_transfer_history_basic_operations() {
    let temp_dir = TempDir::new().unwrap();
    let storage_path = temp_dir.path().join("history.json");
    let manager = TransferHistoryManager::new(storage_path, 100);

    // Create a test record
    let record = create_history_record(
        "test-123".to_string(),
        "test.txt".to_string(),
        1024,
        HistoryTransferMode::Sent,
        Protocol::Tcp,
        "192.168.1.100:8080".to_string(),
        TransferHistoryStatus::Completed,
        Duration::from_secs(30),
        1024,
        "abc123".to_string(),
        None,
        vec![],
    );

    // Add record
    manager.add_record(record.clone()).await.unwrap();

    // Load history
    let history = manager.load_history().await.unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].id, "test-123");
    assert_eq!(history[0].filename, "test.txt");
    assert_eq!(history[0].file_size, 1024);
}

#[tokio::test]
async fn test_transfer_history_filtering() {
    let temp_dir = TempDir::new().unwrap();
    let storage_path = temp_dir.path().join("history.json");
    let manager = TransferHistoryManager::new(storage_path, 100);

    // Create test records
    let record1 = create_history_record(
        "test-1".to_string(),
        "file1.txt".to_string(),
        1024,
        HistoryTransferMode::Sent,
        Protocol::Tcp,
        "192.168.1.100:8080".to_string(),
        TransferHistoryStatus::Completed,
        Duration::from_secs(30),
        1024,
        "abc123".to_string(),
        None,
        vec![],
    );

    let record2 = create_history_record(
        "test-2".to_string(),
        "file2.txt".to_string(),
        2048,
        HistoryTransferMode::Received,
        Protocol::Udp,
        "192.168.1.101:8080".to_string(),
        TransferHistoryStatus::Failed,
        Duration::from_secs(0),
        0,
        "".to_string(),
        Some("Connection timeout".to_string()),
        vec![],
    );

    manager.add_record(record1).await.unwrap();
    manager.add_record(record2).await.unwrap();

    // Test filtering by status
    let filter = HistoryFilter::new().with_status(TransferHistoryStatus::Completed);
    let filtered = manager.get_filtered_history(&filter).await.unwrap();
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].id, "test-1");

    // Test filtering by protocol
    let filter = HistoryFilter::new().with_protocol(Protocol::Udp);
    let filtered = manager.get_filtered_history(&filter).await.unwrap();
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].id, "test-2");

    // Test filtering by mode
    let filter = HistoryFilter::new().with_mode(HistoryTransferMode::Received);
    let filtered = manager.get_filtered_history(&filter).await.unwrap();
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].id, "test-2");
}

#[tokio::test]
async fn test_transfer_history_export_import() {
    let temp_dir = TempDir::new().unwrap();
    let storage_path = temp_dir.path().join("history.json");
    let export_path = temp_dir.path().join("export.json");
    let manager = TransferHistoryManager::new(storage_path, 100);

    // Create and add a test record
    let record = create_history_record(
        "test-export".to_string(),
        "export-test.txt".to_string(),
        1024,
        HistoryTransferMode::Sent,
        Protocol::Tcp,
        "192.168.1.100:8080".to_string(),
        TransferHistoryStatus::Completed,
        Duration::from_secs(30),
        1024,
        "abc123".to_string(),
        None,
        vec![],
    );

    manager.add_record(record).await.unwrap();

    // Export history
    manager.export_history(&export_path).await.unwrap();

    // Create new manager and import
    let import_storage_path = temp_dir.path().join("import_history.json");
    let import_manager = TransferHistoryManager::new(import_storage_path, 100);
    
    let imported_count = import_manager.import_history(&export_path).await.unwrap();
    assert_eq!(imported_count, 1);

    // Verify imported data
    let imported_history = import_manager.load_history().await.unwrap();
    assert_eq!(imported_history.len(), 1);
    assert_eq!(imported_history[0].id, "test-export");
}

#[tokio::test]
async fn test_transfer_history_with_network_logs() {
    let temp_dir = TempDir::new().unwrap();
    let storage_path = temp_dir.path().join("history.json");
    let manager = TransferHistoryManager::new(storage_path, 100);

    // Create network log entries
    let mut metadata = HashMap::new();
    metadata.insert("bytes".to_string(), "1024".to_string());
    
    let log_entry = NetworkLogEntry {
        timestamp: 1640995200000, // 2022-01-01 00:00:00 UTC
        transfer_id: "test-logs".to_string(),
        level: LogLevel::Info,
        category: LogCategory::Connection,
        message: "Connection established".to_string(),
        metadata,
    };

    // Create record with network logs
    let record = create_history_record(
        "test-logs".to_string(),
        "logged-file.txt".to_string(),
        1024,
        HistoryTransferMode::Sent,
        Protocol::Tcp,
        "192.168.1.100:8080".to_string(),
        TransferHistoryStatus::Completed,
        Duration::from_secs(30),
        1024,
        "abc123".to_string(),
        None,
        vec![log_entry],
    );

    manager.add_record(record).await.unwrap();

    // Verify logs are stored
    let history = manager.load_history().await.unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].network_logs.len(), 1);
    assert_eq!(history[0].network_logs[0].message, "Connection established");
}

#[tokio::test]
async fn test_transfer_history_clear() {
    let temp_dir = TempDir::new().unwrap();
    let storage_path = temp_dir.path().join("history.json");
    let manager = TransferHistoryManager::new(storage_path, 100);

    // Add a record
    let record = create_history_record(
        "test-clear".to_string(),
        "clear-test.txt".to_string(),
        1024,
        HistoryTransferMode::Sent,
        Protocol::Tcp,
        "192.168.1.100:8080".to_string(),
        TransferHistoryStatus::Completed,
        Duration::from_secs(30),
        1024,
        "abc123".to_string(),
        None,
        vec![],
    );

    manager.add_record(record).await.unwrap();

    // Verify record exists
    let history = manager.load_history().await.unwrap();
    assert_eq!(history.len(), 1);

    // Clear history
    manager.clear_history().await.unwrap();

    // Verify history is empty
    let history = manager.load_history().await.unwrap();
    assert_eq!(history.len(), 0);
}

#[tokio::test]
async fn test_transfer_history_max_records_limit() {
    let temp_dir = TempDir::new().unwrap();
    let storage_path = temp_dir.path().join("history.json");
    let manager = TransferHistoryManager::new(storage_path, 3); // Limit to 3 records

    // Add 5 records
    for i in 0..5 {
        let record = create_history_record(
            format!("test-{}", i),
            format!("file-{}.txt", i),
            1024,
            HistoryTransferMode::Sent,
            Protocol::Tcp,
            "192.168.1.100:8080".to_string(),
            TransferHistoryStatus::Completed,
            Duration::from_secs(30),
            1024,
            "abc123".to_string(),
            None,
            vec![],
        );

        manager.add_record(record).await.unwrap();
    }

    // Verify only 3 records are kept (most recent)
    let history = manager.load_history().await.unwrap();
    assert_eq!(history.len(), 3);
    
    // Should have the last 3 records (test-4, test-3, test-2)
    assert_eq!(history[0].id, "test-4");
    assert_eq!(history[1].id, "test-3");
    assert_eq!(history[2].id, "test-2");
}