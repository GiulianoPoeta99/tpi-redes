#[cfg(test)]
mod tests {
    use crate::transfer::FileMetadata;

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
}