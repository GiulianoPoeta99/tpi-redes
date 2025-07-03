#[cfg(test)]
mod tests {
    use crate::transfer::TransferStatus;

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