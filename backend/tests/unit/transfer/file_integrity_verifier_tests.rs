#[cfg(test)]
mod tests {
    use crate::crypto::ChecksumCalculator;
    use crate::transfer::FileIntegrityVerifier;
    use tempfile::TempDir;
    use tokio::io::AsyncWriteExt;

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
        
        let chunk1_checksum = ChecksumCalculator::calculate_data_sha256(chunk1_data);
        let chunk2_checksum = ChecksumCalculator::calculate_data_sha256(chunk2_data);
        
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
}