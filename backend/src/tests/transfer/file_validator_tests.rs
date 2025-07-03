#[cfg(test)]
mod tests {
    use crate::transfer::FileValidator;
    use crate::utils::errors::TransferError;
    use std::path::Path;
    use tempfile::TempDir;
    use tokio::io::AsyncWriteExt;

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
}