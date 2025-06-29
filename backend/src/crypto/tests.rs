#[cfg(test)]
mod tests {
    use crate::crypto::ChecksumCalculator;
    use crate::utils::errors::TransferError;
    use std::io::Cursor;
    use std::path::Path;
    use tempfile::{NamedTempFile, TempDir};
    use tokio::io::AsyncWriteExt;

    #[test]
    fn test_calculate_data_sha256() {
        let test_data = b"Hello, World!";
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        let result = ChecksumCalculator::calculate_data_sha256(test_data);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_calculate_stream_sha256() {
        let test_data = b"Hello, World!";
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        let cursor = Cursor::new(test_data);
        let result = ChecksumCalculator::calculate_stream_sha256(cursor).unwrap();
        assert_eq!(result, expected);
    }

    #[test]
    fn test_calculate_empty_data_sha256() {
        let test_data = b"";
        let expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        
        let result = ChecksumCalculator::calculate_data_sha256(test_data);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_verify_integrity() {
        let checksum1 = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        let checksum2 = "DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F";
        let checksum3 = "different_checksum";
        
        assert!(ChecksumCalculator::verify_integrity(checksum1, checksum2));
        assert!(!ChecksumCalculator::verify_integrity(checksum1, checksum3));
    }

    #[tokio::test]
    async fn test_calculate_file_sha256() {
        let mut temp_file = NamedTempFile::new().unwrap();
        let test_data = b"Hello, World!";
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        std::io::Write::write_all(&mut temp_file, test_data).unwrap();
        
        let result = ChecksumCalculator::calculate_file_sha256(temp_file.path()).unwrap();
        assert_eq!(result, expected);
    }

    #[tokio::test]
    async fn test_calculate_file_sha256_async() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = b"Hello, World!";
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let result = ChecksumCalculator::calculate_file_sha256_async(&file_path).await.unwrap();
        assert_eq!(result, expected);
    }

    #[tokio::test]
    async fn test_calculate_large_file_sha256() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("large_test.txt");
        
        // Create a larger file (100KB)
        let chunk = vec![b'A'; 1024]; // 1KB of 'A's
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        
        for _ in 0..100 {
            file.write_all(&chunk).await.unwrap();
        }
        file.flush().await.unwrap();
        
        let result = ChecksumCalculator::calculate_file_sha256_async(&file_path).await.unwrap();
        
        // Verify it's a valid SHA-256 hash (64 hex characters)
        assert_eq!(result.len(), 64);
        assert!(result.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[tokio::test]
    async fn test_calculate_stream_sha256_async() {
        let test_data = b"Hello, World!";
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        let cursor = Cursor::new(test_data);
        let result = ChecksumCalculator::calculate_stream_sha256_async(cursor).await.unwrap();
        assert_eq!(result, expected);
    }

    #[tokio::test]
    async fn test_calculate_chunk_sha256_with_progress() {
        let test_data = b"Hello, World! This is a longer test string for chunk processing.";
        let expected = ChecksumCalculator::calculate_data_sha256(test_data);
        
        let mut progress_calls = Vec::new();
        let result = ChecksumCalculator::calculate_chunk_sha256_with_progress(
            test_data,
            |processed, total| {
                progress_calls.push((processed, total));
            }
        ).await;
        
        assert_eq!(result, expected);
        assert!(!progress_calls.is_empty());
        
        // Verify progress calls are reasonable
        let (last_processed, total) = progress_calls.last().unwrap();
        assert_eq!(*last_processed, test_data.len());
        assert_eq!(*total, test_data.len());
    }

    #[test]
    fn test_calculate_file_sha256_nonexistent() {
        let result = ChecksumCalculator::calculate_file_sha256(Path::new("/nonexistent/file.txt"));
        assert!(result.is_err());
        
        if let Err(TransferError::FileError { message, .. }) = result {
            assert!(message.contains("Failed to open file"));
        } else {
            panic!("Expected FileError");
        }
    }

    #[tokio::test]
    async fn test_calculate_file_sha256_async_nonexistent() {
        let result = ChecksumCalculator::calculate_file_sha256_async(Path::new("/nonexistent/file.txt")).await;
        assert!(result.is_err());
        
        if let Err(TransferError::FileError { message, .. }) = result {
            assert!(message.contains("Failed to open file"));
        } else {
            panic!("Expected FileError");
        }
    }
}