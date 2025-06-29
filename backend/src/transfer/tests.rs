#[cfg(test)]
mod tests {
    use crate::transfer::{
        FileMetadata, FileValidator, FileChunker, FileIntegrityVerifier,
        TransferProgress, TransferResult, TransferStatus
    };
    use crate::utils::errors::TransferError;
    use std::path::Path;
    use std::time::Duration;
    use tempfile::TempDir;
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    async fn test_file_metadata_from_path() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = b"Hello, World!";
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let metadata = FileMetadata::from_path(&file_path).await.unwrap();
        
        assert_eq!(metadata.name, "test.txt");
        assert_eq!(metadata.size, test_data.len() as u64);
        assert_eq!(metadata.file_type, "txt");
        assert!(metadata.created.is_some());
        assert!(metadata.modified.is_some());
    }

    #[tokio::test]
    async fn test_file_metadata_validate_size() {
        let metadata = FileMetadata {
            name: "test.txt".to_string(),
            size: 1000,
            file_type: "txt".to_string(),
            checksum: None,
            created: None,
            modified: None,
        };
        
        // Should pass with larger limit
        assert!(metadata.validate_size(2000).is_ok());
        
        // Should fail with smaller limit
        assert!(metadata.validate_size(500).is_err());
    }

    #[tokio::test]
    async fn test_file_metadata_validate_type() {
        let metadata = FileMetadata {
            name: "test.txt".to_string(),
            size: 1000,
            file_type: "txt".to_string(),
            checksum: None,
            created: None,
            modified: None,
        };
        
        // Should pass with allowed type
        assert!(metadata.validate_type(&["txt", "pdf"]).is_ok());
        
        // Should fail with disallowed type
        assert!(metadata.validate_type(&["pdf", "doc"]).is_err());
        
        // Should pass with empty allowed types (no restrictions)
        assert!(metadata.validate_type(&[]).is_ok());
    }

    #[tokio::test]
    async fn test_file_validator_validate_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = b"Hello, World!";
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(test_data).await.unwrap();
        file.flush().await.unwrap();
        
        // Should pass validation
        let metadata = FileValidator::validate_file(&file_path, None, None).await.unwrap();
        assert_eq!(metadata.name, "test.txt");
        assert_eq!(metadata.size, test_data.len() as u64);
    }

    #[tokio::test]
    async fn test_file_validator_nonexistent_file() {
        let result = FileValidator::validate_file(
            Path::new("/nonexistent/file.txt"),
            None,
            None
        ).await;
        
        assert!(result.is_err());
        if let Err(TransferError::FileError { message, .. }) = result {
            assert!(message.contains("does not exist"));
        } else {
            panic!("Expected FileError");
        }
    }

    #[tokio::test]
    async fn test_file_validator_directory_as_file() {
        let temp_dir = TempDir::new().unwrap();
        
        let result = FileValidator::validate_file(temp_dir.path(), None, None).await;
        
        assert!(result.is_err());
        if let Err(TransferError::FileError { message, .. }) = result {
            assert!(message.contains("not a file"));
        } else {
            panic!("Expected FileError");
        }
    }

    #[tokio::test]
    async fn test_file_validator_size_limit() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("large.txt");
        let test_data = vec![b'A'; 1000]; // 1KB file
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        // Should fail with smaller size limit
        let result = FileValidator::validate_file(&file_path, Some(500), None).await;
        assert!(result.is_err());
        
        // Should pass with larger size limit
        let result = FileValidator::validate_file(&file_path, Some(2000), None).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_file_validator_type_restriction() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = b"Hello, World!";
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(test_data).await.unwrap();
        file.flush().await.unwrap();
        
        // Should pass with allowed type
        let result = FileValidator::validate_file(&file_path, None, Some(&["txt", "pdf"])).await;
        assert!(result.is_ok());
        
        // Should fail with disallowed type
        let result = FileValidator::validate_file(&file_path, None, Some(&["pdf", "doc"])).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_file_validator_check_readable() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("readable.txt");
        let test_data = b"Hello, World!";
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(test_data).await.unwrap();
        file.flush().await.unwrap();
        
        // Should be readable
        assert!(FileValidator::check_readable(&file_path).await.is_ok());
        
        // Should fail for nonexistent file
        assert!(FileValidator::check_readable(Path::new("/nonexistent.txt")).await.is_err());
    }

    #[tokio::test]
    async fn test_file_validator_check_writable_dir() {
        let temp_dir = TempDir::new().unwrap();
        
        // Should be writable
        assert!(FileValidator::check_writable_dir(temp_dir.path()).await.is_ok());
        
        // Should fail for nonexistent directory
        assert!(FileValidator::check_writable_dir(Path::new("/nonexistent")).await.is_err());
    }

    #[tokio::test]
    async fn test_file_chunker_new_reader() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = vec![b'A'; 1000]; // 1KB file
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let chunker = FileChunker::new_reader(file_path, 256).await.unwrap();
        
        assert_eq!(chunker.file_size(), 1000);
        assert_eq!(chunker.chunk_size(), 256);
        assert_eq!(chunker.total_chunks(), 4); // ceil(1000/256) = 4
    }

    #[tokio::test]
    async fn test_file_chunker_new_writer() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("output.txt");
        
        let chunker = FileChunker::new_writer(file_path.clone(), 1000, 256).await.unwrap();
        
        assert_eq!(chunker.file_size(), 1000);
        assert_eq!(chunker.chunk_size(), 256);
        assert_eq!(chunker.total_chunks(), 4);
        
        // File should be created
        assert!(file_path.exists());
    }

    #[tokio::test]
    async fn test_file_chunker_read_write_chunks() {
        let temp_dir = TempDir::new().unwrap();
        let input_path = temp_dir.path().join("input.txt");
        let output_path = temp_dir.path().join("output.txt");
        
        // Create input file with known data
        let test_data = (0..255u8).cycle().take(1000).collect::<Vec<u8>>(); // 1000 bytes of sequential data
        let mut file = tokio::fs::File::create(&input_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        // Create chunkers
        let reader = FileChunker::new_reader(input_path, 256).await.unwrap();
        let writer = FileChunker::new_writer(output_path.clone(), 1000, 256).await.unwrap();
        
        // Read and write all chunks
        for chunk_id in 0..reader.total_chunks() {
            let chunk_data = reader.read_chunk(chunk_id as u32).await.unwrap();
            writer.write_chunk(chunk_id as u32, chunk_data).await.unwrap();
        }
        
        // Verify the output file matches the input
        let output_data = tokio::fs::read(&output_path).await.unwrap();
        assert_eq!(output_data, test_data);
    }

    #[tokio::test]
    async fn test_file_chunker_chunk_actual_size() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = vec![b'A'; 1000]; // 1KB file
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let chunker = FileChunker::new_reader(file_path, 256).await.unwrap();
        
        // First 3 chunks should be full size
        assert_eq!(chunker.chunk_actual_size(0), 256);
        assert_eq!(chunker.chunk_actual_size(1), 256);
        assert_eq!(chunker.chunk_actual_size(2), 256);
        
        // Last chunk should be smaller
        assert_eq!(chunker.chunk_actual_size(3), 232); // 1000 - 3*256 = 232
        
        // Invalid chunk ID should return 0
        assert_eq!(chunker.chunk_actual_size(10), 0);
    }

    #[tokio::test]
    async fn test_file_chunker_invalid_chunk_id() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = vec![b'A'; 1000];
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let chunker = FileChunker::new_reader(file_path, 256).await.unwrap();
        
        // Should fail with invalid chunk ID
        let result = chunker.read_chunk(100).await;
        assert!(result.is_err());
        
        if let Err(TransferError::FileError { message, .. }) = result {
            assert!(message.contains("exceeds total chunks"));
        } else {
            panic!("Expected FileError");
        }
    }

    #[tokio::test]
    async fn test_file_integrity_verifier_verify_transfer_integrity() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("source.txt");
        let dest_path = temp_dir.path().join("dest.txt");
        let test_data = b"Hello, World!";
        
        // Create identical files
        for path in [&source_path, &dest_path] {
            let mut file = tokio::fs::File::create(path).await.unwrap();
            file.write_all(test_data).await.unwrap();
            file.flush().await.unwrap();
        }
        
        let result = FileIntegrityVerifier::verify_transfer_integrity(&source_path, &dest_path).await.unwrap();
        assert!(result);
        
        // Modify destination file
        let mut file = tokio::fs::OpenOptions::new()
            .write(true)
            .append(true)
            .open(&dest_path)
            .await
            .unwrap();
        file.write_all(b" Modified").await.unwrap();
        file.flush().await.unwrap();
        
        let result = FileIntegrityVerifier::verify_transfer_integrity(&source_path, &dest_path).await.unwrap();
        assert!(!result);
    }

    #[tokio::test]
    async fn test_file_integrity_verifier_verify_against_checksum() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = b"Hello, World!";
        let expected_checksum = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let result = FileIntegrityVerifier::verify_against_checksum(&file_path, expected_checksum).await.unwrap();
        assert!(result);
        
        let wrong_checksum = "wrong_checksum";
        let result = FileIntegrityVerifier::verify_against_checksum(&file_path, wrong_checksum).await.unwrap();
        assert!(!result);
    }

    #[tokio::test]
    async fn test_file_integrity_verifier_verify_chunked_integrity() {
        let chunk1_data = b"Hello, ";
        let chunk2_data = b"World!";
        
        let chunk1_checksum = crate::crypto::ChecksumCalculator::calculate_data_sha256(chunk1_data);
        let chunk2_checksum = crate::crypto::ChecksumCalculator::calculate_data_sha256(chunk2_data);
        
        let chunks = vec![
            (0, chunk1_data.to_vec()),
            (1, chunk2_data.to_vec()),
        ];
        
        let expected_checksums = vec![
            (0, chunk1_checksum.clone()),
            (1, chunk2_checksum.clone()),
        ];
        
        let result = FileIntegrityVerifier::verify_chunked_integrity(&chunks, &expected_checksums).await.unwrap();
        assert!(result);
        
        // Test with wrong checksum
        let wrong_checksums = vec![
            (0, chunk1_checksum.clone()),
            (1, "wrong_checksum".to_string()),
        ];
        
        let result = FileIntegrityVerifier::verify_chunked_integrity(&chunks, &wrong_checksums).await.unwrap();
        assert!(!result);
        
        // Test with mismatched chunk IDs
        let mismatched_checksums = vec![
            (1, chunk1_checksum),
            (0, chunk2_checksum),
        ];
        
        let result = FileIntegrityVerifier::verify_chunked_integrity(&chunks, &mismatched_checksums).await.unwrap();
        assert!(!result);
    }

    #[tokio::test]
    async fn test_transfer_progress_new() {
        let progress = TransferProgress::new("test-123".to_string());
        
        assert_eq!(progress.transfer_id, "test-123");
        assert_eq!(progress.progress, 0.0);
        assert_eq!(progress.speed, 0.0);
        assert_eq!(progress.eta, 0);
        assert_eq!(progress.status, TransferStatus::Idle);
        assert!(progress.error.is_none());
    }

    #[tokio::test]
    async fn test_transfer_progress_update() {
        let mut progress = TransferProgress::new("test-123".to_string());
        progress.status = TransferStatus::Transferring;
        
        progress.update(0.5, 1024.0, 30);
        
        assert_eq!(progress.progress, 0.5);
        assert_eq!(progress.speed, 1024.0);
        assert_eq!(progress.eta, 30);
        assert_eq!(progress.status, TransferStatus::Transferring);
        
        // Test completion
        progress.update(1.0, 2048.0, 0);
        assert_eq!(progress.status, TransferStatus::Completed);
    }

    #[tokio::test]
    async fn test_transfer_progress_human_readable() {
        let mut progress = TransferProgress::new("test-123".to_string());
        
        progress.speed = 1024.0;
        assert_eq!(progress.speed_human_readable(), "1.0 KB/s");
        
        progress.speed = 1024.0 * 1024.0;
        assert_eq!(progress.speed_human_readable(), "1.0 MB/s");
        
        progress.eta = 3661; // 1h 1m 1s
        assert_eq!(progress.eta_human_readable(), "1h 1m 1s");
        
        progress.eta = 61; // 1m 1s
        assert_eq!(progress.eta_human_readable(), "1m 1s");
        
        progress.eta = 30; // 30s
        assert_eq!(progress.eta_human_readable(), "30s");
    }

    #[tokio::test]
    async fn test_transfer_result_success() {
        let result = TransferResult::success(
            "test-123".to_string(),
            1024,
            Duration::from_secs(10),
            "checksum123".to_string(),
        );
        
        assert!(result.success);
        assert_eq!(result.transfer_id, "test-123");
        assert_eq!(result.bytes_transferred, 1024);
        assert_eq!(result.checksum, "checksum123");
        assert!(result.error.is_none());
        
        assert_eq!(result.average_speed(), 102.4); // 1024 bytes / 10 seconds
    }

    #[tokio::test]
    async fn test_transfer_result_failure() {
        let result = TransferResult::failure("test-123".to_string(), "Network error".to_string());
        
        assert!(!result.success);
        assert_eq!(result.transfer_id, "test-123");
        assert_eq!(result.bytes_transferred, 0);
        assert_eq!(result.error, Some("Network error".to_string()));
    }

    #[tokio::test]
    async fn test_transfer_status_methods() {
        assert!(TransferStatus::Completed.is_terminal());
        assert!(TransferStatus::Error.is_terminal());
        assert!(!TransferStatus::Transferring.is_terminal());
        
        assert!(TransferStatus::Connecting.is_active());
        assert!(TransferStatus::Transferring.is_active());
        assert!(!TransferStatus::Completed.is_active());
    }
}