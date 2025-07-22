#[cfg(test)]
mod retry_handler_tests {
    use crate::errors::{RetryHandler, TransferError, RetryConfiguration};
    use std::time::Duration;
    use std::sync::{Arc, Mutex};

    #[tokio::test]
    async fn test_retry_handler_success_on_first_try() {
        let retry_config = RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(10),
            max_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
            jitter: false,
        };
        
        let retry_handler = RetryHandler::new(retry_config);
        let call_count = Arc::new(Mutex::new(0));
        let call_count_clone = call_count.clone();
        
        let result = retry_handler.execute_with_retry(|| {
            let count = call_count_clone.clone();
            async move {
                let mut counter = count.lock().unwrap();
                *counter += 1;
                Ok("Success")
            }
        }).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Success");
        assert_eq!(*call_count.lock().unwrap(), 1);
    }

    #[tokio::test]
    async fn test_retry_handler_success_after_retries() {
        let retry_config = RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(10),
            max_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
            jitter: false,
        };
        
        let retry_handler = RetryHandler::new(retry_config);
        let call_count = Arc::new(Mutex::new(0));
        let call_count_clone = call_count.clone();
        
        let result = retry_handler.execute_with_retry(|| {
            let count = call_count_clone.clone();
            async move {
                let mut counter = count.lock().unwrap();
                *counter += 1;
                
                if *counter < 3 {
                    Err(TransferError::NetworkError {
                        message: "Temporary failure".to_string(),
                        context: None,
                        recoverable: true,
                    })
                } else {
                    Ok("Success")
                }
            }
        }).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Success");
        assert_eq!(*call_count.lock().unwrap(), 3);
    }

    #[tokio::test]
    async fn test_retry_handler_exhausted() {
        let retry_config = RetryConfiguration {
            max_attempts: 2,
            initial_delay: Duration::from_millis(10),
            max_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
            jitter: false,
        };
        
        let retry_handler = RetryHandler::new(retry_config);
        let call_count = Arc::new(Mutex::new(0));
        let call_count_clone = call_count.clone();
        
        let result = retry_handler.execute_with_retry(|| {
            let count = call_count_clone.clone();
            async move {
                let mut counter = count.lock().unwrap();
                *counter += 1;
                
                Err(TransferError::NetworkError {
                    message: "Persistent failure".to_string(),
                    context: None,
                    recoverable: true,
                })
            }
        }).await;
        
        assert!(result.is_err());
        assert_eq!(*call_count.lock().unwrap(), 2);
    }

    #[tokio::test]
    async fn test_non_recoverable_error_no_retry() {
        let retry_config = RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(10),
            max_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
            jitter: false,
        };
        
        let retry_handler = RetryHandler::new(retry_config);
        let call_count = Arc::new(Mutex::new(0));
        let call_count_clone = call_count.clone();
        
        let result = retry_handler.execute_with_retry(|| {
            let count = call_count_clone.clone();
            async move {
                let mut counter = count.lock().unwrap();
                *counter += 1;
                
                Err(TransferError::FileError {
                    message: "File corrupted".to_string(),
                    file_path: None,
                    recoverable: false,
                })
            }
        }).await;
        
        assert!(result.is_err());
        // Should not retry for non-recoverable errors
        assert_eq!(*call_count.lock().unwrap(), 1);
    }
}