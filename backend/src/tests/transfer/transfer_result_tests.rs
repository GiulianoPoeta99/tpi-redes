#[cfg(test)]
mod tests {
    use crate::transfer::TransferResult;
    use std::time::Duration;

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
}