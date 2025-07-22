#[cfg(test)]
mod error_utilities_tests {
    use crate::errors::{ErrorContext, ErrorCollector, ConfigValidator, TransferError};
    use std::time::Duration;
    use tempfile::NamedTempFile;

    #[test]
    fn test_error_context_builder() {
        let context = ErrorContext::new()
            .with_operation("test_operation")
            .with_transfer_id("test_id_123");
        
        let base_error = TransferError::NetworkError {
            message: "Connection failed".to_string(),
            context: None,
            recoverable: true,
        };
        
        let enhanced_error = context.apply_to_error(base_error);
        
        match enhanced_error {
            TransferError::NetworkError { context: Some(ctx), .. } => {
                assert_eq!(ctx, "test_operation");
            }
            _ => panic!("Expected NetworkError with context"),
        }
    }

    #[test]
    fn test_error_collector() {
        let mut collector = ErrorCollector::new();
        
        assert!(!collector.has_errors());
        
        collector.add_error(TransferError::ConfigError {
            message: "Invalid port".to_string(),
            field: Some("port".to_string()),
        });
        
        collector.add_error(TransferError::ConfigError {
            message: "Invalid address".to_string(),
            field: Some("address".to_string()),
        });
        
        assert!(collector.has_errors());
        assert_eq!(collector.errors().len(), 2);
        
        let result = collector.into_result(());
        assert!(result.is_err());
    }

    #[test]
    fn test_error_collector_success() {
        let collector = ErrorCollector::new();
        let result = collector.into_result("success");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "success");
    }

    #[test]
    fn test_config_validator_port() {
        assert!(ConfigValidator::validate_port(8080).is_ok());
        assert!(ConfigValidator::validate_port(1024).is_ok());
        assert!(ConfigValidator::validate_port(65535).is_ok());
        
        assert!(ConfigValidator::validate_port(0).is_err());
    }

    #[test]
    fn test_config_validator_ip() {
        // Valid IPs
        assert!(ConfigValidator::validate_ip_address("127.0.0.1").is_ok());
        assert!(ConfigValidator::validate_ip_address("192.168.1.1").is_ok());
        assert!(ConfigValidator::validate_ip_address("localhost").is_ok());
        assert!(ConfigValidator::validate_ip_address("::1").is_ok());
        
        // Invalid IPs
        assert!(ConfigValidator::validate_ip_address("").is_err());
        assert!(ConfigValidator::validate_ip_address("invalid").is_err());
    }

    #[test]
    fn test_config_validator_chunk_size() {
        assert!(ConfigValidator::validate_chunk_size(1024).is_ok());
        assert!(ConfigValidator::validate_chunk_size(8192).is_ok());
        assert!(ConfigValidator::validate_chunk_size(65536).is_ok());
        
        assert!(ConfigValidator::validate_chunk_size(0).is_err());
        assert!(ConfigValidator::validate_chunk_size(2 * 1024 * 1024).is_err());
    }

    #[test]
    fn test_config_validator_timeout() {
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(1)).is_ok());
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(30)).is_ok());
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(300)).is_ok());
        
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(0)).is_err());
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(3601)).is_err());
    }

    #[tokio::test]
    async fn test_file_error_helper_valid_file() {
        use crate::errors::FileErrorHelper;
        
        let temp_file = NamedTempFile::new().unwrap();
        let result = FileErrorHelper::validate_file_access(temp_file.path(), "test").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_file_error_helper_nonexistent_file() {
        use crate::errors::FileErrorHelper;
        use std::path::Path;
        
        let nonexistent = Path::new("/nonexistent/file.txt");
        let result = FileErrorHelper::validate_file_access(nonexistent, "test").await;
        assert!(result.is_err());
        
        match result.unwrap_err() {
            TransferError::FileNotFound { .. } => (),
            _ => panic!("Expected FileNotFound error"),
        }
    }
}