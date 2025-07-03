#[cfg(test)]
mod tests {
    use crate::transfer::TransferProgress;
    use crate::transfer::TransferStatus;

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
}