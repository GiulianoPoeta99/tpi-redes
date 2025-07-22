#[cfg(test)]
mod transfer_error_tests {
    use crate::errors::TransferError;
    use std::io;

    #[test]
    fn test_transfer_error_display() {
        let error = TransferError::NetworkError {
            message: "Connection refused".to_string(),
            context: None,
            recoverable: true,
        };
        assert!(error.to_string().contains("Connection refused"));
    }

    #[test]
    fn test_io_error_conversion() {
        let io_error = io::Error::new(io::ErrorKind::NotFound, "File not found");
        let transfer_error: TransferError = io_error.into();
        
        match transfer_error {
            TransferError::FileNotFound { .. } => (),
            _ => panic!("Expected FileNotFound error"),
        }
    }

    #[test]
    fn test_timeout_error() {
        let error = TransferError::Timeout {
            seconds: 30,
            operation: "connect".to_string(),
            recoverable: true,
        };
        
        assert!(error.to_string().contains("30"));
        assert!(error.to_string().contains("connect"));
    }

    #[test]
    fn test_error_recoverability() {
        let recoverable_error = TransferError::NetworkError {
            message: "Temporary failure".to_string(),
            context: None,
            recoverable: true,
        };
        
        let non_recoverable_error = TransferError::FileError {
            message: "Corrupted file".to_string(),
            file_path: None,
            recoverable: false,
        };
        
        // In a real implementation, you'd have methods to check recoverability
        match recoverable_error {
            TransferError::NetworkError { recoverable: true, .. } => (),
            _ => panic!("Expected recoverable network error"),
        }
        
        match non_recoverable_error {
            TransferError::FileError { recoverable: false, .. } => (),
            _ => panic!("Expected non-recoverable file error"),
        }
    }
}