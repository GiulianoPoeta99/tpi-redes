// Basic integration tests for file transfer functionality
use file_transfer_backend::{
    crypto::ChecksumCalculator,
    core::transfer::TransferProgress,
};

use tempfile::TempDir;
use tokio::io::AsyncWriteExt;

#[tokio::test]
async fn test_checksum_calculation() {
    let temp_dir = TempDir::new().unwrap();
    let test_file = temp_dir.path().join("test.txt");
    
    // Create test file
    let test_data = b"Hello, World! This is a test file for checksum calculation.";
    let mut file = tokio::fs::File::create(&test_file).await.unwrap();
    file.write_all(test_data).await.unwrap();
    file.flush().await.unwrap();
    
    // Calculate checksum
    let checksum = ChecksumCalculator::calculate_file_sha256_async(&test_file).await.unwrap();
    
    // Verify checksum is not empty and has expected length (SHA256 = 64 hex chars)
    assert!(!checksum.is_empty());
    assert_eq!(checksum.len(), 64);
    
    // Calculate again to ensure consistency
    let checksum2 = ChecksumCalculator::calculate_file_sha256_async(&test_file).await.unwrap();
    assert_eq!(checksum, checksum2);
}

#[tokio::test]
async fn test_transfer_progress_tracking() {
    let mut progress = TransferProgress::new("test-transfer".to_string());
    
    // Test initial state
    assert_eq!(progress.transfer_id, "test-transfer");
    assert_eq!(progress.progress, 0.0);
    
    // Test progress updates
    progress.update(0.5, 1000.0, 30);
    assert_eq!(progress.progress, 0.5);
    
    progress.update(1.0, 2000.0, 0);
    assert_eq!(progress.progress, 1.0);
}