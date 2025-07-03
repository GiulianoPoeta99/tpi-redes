// Integration tests for file transfer functionality
use file_transfer_backend::crypto::ChecksumCalculator;
use file_transfer_backend::transfer::{
    FileChunker, FileIntegrityVerifier, FileValidator, TransferProgress, TransferStatus
};

use tempfile::TempDir;
use tokio::io::AsyncWriteExt;

#[tokio::test]
async fn test_complete_file_transfer_workflow() {
    let temp_dir = TempDir::new().unwrap();
    let source_path = temp_dir.path().join("source.txt");
    let dest_path = temp_dir.path().join("dest.txt");
    
    // Create source file
    let test_data = b"This is a test file for complete transfer workflow testing.";
    let mut file = tokio::fs::File::create(&source_path).await.unwrap();
    file.write_all(test_data).await.unwrap();
    file.flush().await.unwrap();
    
    // Step 1: Validate source file
    let metadata = FileValidator::validate_file(&source_path, None, None).await.unwrap();
    assert_eq!(metadata.size, test_data.len() as u64);
    
    // Step 2: Calculate source checksum
    let source_checksum = ChecksumCalculator::calculate_file_sha256_async(&source_path).await.unwrap();
    
    // Step 3: Chunk the file
    let chunker = FileChunker::new_reader(source_path.clone(), 20).await.unwrap(); // Small chunks for testing
    let total_chunks = chunker.total_chunks();
    
    // Step 4: Create destination file chunker
    let dest_chunker = FileChunker::new_writer(dest_path.clone(), metadata.size, 20).await.unwrap();
    
    // Step 5: Transfer chunks with progress tracking
    let mut progress = TransferProgress::new("test-transfer".to_string());
    progress.status = TransferStatus::Transferring;
    
    for chunk_id in 0..total_chunks {
        let chunk_data = chunker.read_chunk(chunk_id as u32).await.unwrap();
        dest_chunker.write_chunk(chunk_id as u32, chunk_data).await.unwrap();
        
        let progress_value = (chunk_id + 1) as f64 / total_chunks as f64;
        progress.update(progress_value, 1024.0, 0);
    }
    
    // Step 6: Verify integrity
    let integrity_verified = FileIntegrityVerifier::verify_transfer_integrity(&source_path, &dest_path).await.unwrap();
    assert!(integrity_verified);
    
    // Step 7: Verify against original checksum
    let checksum_verified = FileIntegrityVerifier::verify_against_checksum(&dest_path, &source_checksum).await.unwrap();
    assert!(checksum_verified);
    
    // Step 8: Verify final progress state
    assert_eq!(progress.status, TransferStatus::Completed);
    assert_eq!(progress.progress, 1.0);
}

#[tokio::test]
async fn test_large_file_chunked_transfer() {
    let temp_dir = TempDir::new().unwrap();
    let source_path = temp_dir.path().join("large_source.bin");
    let dest_path = temp_dir.path().join("large_dest.bin");
    
    // Create a larger test file (10KB)
    let chunk_data = vec![0xAB; 1024]; // 1KB chunks
    let mut file = tokio::fs::File::create(&source_path).await.unwrap();
    for _ in 0..10 {
        file.write_all(&chunk_data).await.unwrap();
    }
    file.flush().await.unwrap();
    
    // Calculate original checksum
    let original_checksum = ChecksumCalculator::calculate_file_sha256_async(&source_path).await.unwrap();
    
    // Transfer using chunking
    let reader = FileChunker::new_reader(source_path.clone(), 512).await.unwrap(); // 512 byte chunks
    let writer = FileChunker::new_writer(dest_path.clone(), 10240, 512).await.unwrap();
    
    for chunk_id in 0..reader.total_chunks() {
        let data = reader.read_chunk(chunk_id as u32).await.unwrap();
        writer.write_chunk(chunk_id as u32, data).await.unwrap();
    }
    
    // Verify the transfer
    let dest_checksum = ChecksumCalculator::calculate_file_sha256_async(&dest_path).await.unwrap();
    assert_eq!(original_checksum, dest_checksum);
    
    // Verify file sizes match
    let source_metadata = tokio::fs::metadata(&source_path).await.unwrap();
    let dest_metadata = tokio::fs::metadata(&dest_path).await.unwrap();
    assert_eq!(source_metadata.len(), dest_metadata.len());
}

#[tokio::test]
async fn test_file_validation_and_error_handling() {
    let temp_dir = TempDir::new().unwrap();
    
    // Test with non-existent file
    let non_existent = temp_dir.path().join("does_not_exist.txt");
    let result = FileValidator::validate_file(&non_existent, None, None).await;
    assert!(result.is_err());
    
    // Test with directory instead of file
    let result = FileValidator::validate_file(temp_dir.path(), None, None).await;
    assert!(result.is_err());
    
    // Test with file that exceeds size limit
    let large_file = temp_dir.path().join("large.txt");
    let large_data = vec![b'X'; 2000]; // 2KB file
    let mut file = tokio::fs::File::create(&large_file).await.unwrap();
    file.write_all(&large_data).await.unwrap();
    file.flush().await.unwrap();
    
    let result = FileValidator::validate_file(&large_file, Some(1000), None).await; // 1KB limit
    assert!(result.is_err());
    
    // Test with restricted file type
    let txt_file = temp_dir.path().join("test.txt");
    let mut file = tokio::fs::File::create(&txt_file).await.unwrap();
    file.write_all(b"test").await.unwrap();
    file.flush().await.unwrap();
    
    let result = FileValidator::validate_file(&txt_file, None, Some(&["pdf", "doc"])).await;
    assert!(result.is_err());
    
    // Test with allowed file type
    let result = FileValidator::validate_file(&txt_file, None, Some(&["txt", "pdf"])).await;
    assert!(result.is_ok());
}