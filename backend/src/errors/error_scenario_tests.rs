#[cfg(test)]
mod error_scenario_tests {
    use super::*;
    use crate::errors::{TransferError, NetworkErrorDetector, ErrorPattern};
    use crate::errors::recovery::{RetryHandler, RetryConfiguration, ErrorRecoveryStrategies};
    use std::io::{Error as IoError, ErrorKind};
    use std::time::Duration;
    use tokio_test;

    /// Test network error classification and recovery
    #[test]
    fn test_network_error_classification() {
        // Test connection refused
        let io_error = IoError::new(ErrorKind::ConnectionRefused, "Connection refused");
        let transfer_error = NetworkErrorDetector::classify_io_error(io_error, Some("127.0.0.1:8080".to_string()));
        
        match transfer_error {
            TransferError::ConnectionRefused { address, recoverable } => {
                assert_eq!(address, "127.0.0.1:8080");
                assert!(recoverable);
            }
            _ => panic!("Expected ConnectionRefused error"),
        }

        // Test timeout
        let io_error = IoError::new(ErrorKind::TimedOut, "Operation timed out");
        let transfer_error = NetworkErrorDetector::classify_io_error(io_error, None);
        
        match transfer_error {
            TransferError::NetworkError { message, recoverable, .. } => {
                assert!(message.contains("timed out"));
                assert!(recoverable);
            }
            _ => panic!("Expected NetworkError for timeout"),
        }

        // Test connection reset
        let io_error = IoError::new(ErrorKind::ConnectionReset, "Connection reset by peer");
        let transfer_error = NetworkErrorDetector::classify_io_error(io_error, None);
        
        match transfer_error {
            TransferError::NetworkError { message, recoverable, .. } => {
                assert!(message.contains("reset"));
                assert!(recoverable);
            }
            _ => panic!("Expected NetworkError for connection reset"),
        }
    }

    /// Test error pattern analysis
    #[test]
    fn test_error_pattern_analysis() {
        // Test network instability pattern
        let network_errors = vec![
            TransferError::NetworkError { 
                message: "Connection reset".to_string(), 
                context: None, 
                recoverable: true 
            },
            TransferError::NetworkError { 
                message: "Connection interrupted".to_string(), 
                context: None, 
                recoverable: true 
            },
            TransferError::NetworkError { 
                message: "Network unreachable".to_string(), 
                context: None, 
                recoverable: true 
            },
        ];

        let pattern = NetworkErrorDetector::analyze_error_pattern(&network_errors);
        assert!(matches!(pattern, ErrorPattern::NetworkInstability));

        // Test timeout pattern
        let timeout_errors = vec![
            TransferError::Timeout { 
                seconds: 30, 
                operation: "connect".to_string(), 
                recoverable: true 
            },
            TransferError::Timeout { 
                seconds: 30, 
                operation: "read".to_string(), 
                recoverable: true 
            },
            TransferError::NetworkError { 
                message: "slow".to_string(), 
                context: None, 
                recoverable: true 
            },
        ];

        let pattern = NetworkErrorDetector::analyze_error_pattern(&timeout_errors);
        assert!(matches!(pattern, ErrorPattern::SlowNetwork));

        // Test checksum mismatch pattern
        let checksum_errors = vec![
            TransferError::ChecksumMismatch { 
                expected: "abc123".to_string(), 
                actual: "def456".to_string(), 
                file_path: "test.txt".to_string() 
            },
            TransferError::ChecksumMismatch { 
                expected: "xyz789".to_string(), 
                actual: "uvw012".to_string(), 
                file_path: "test2.txt".to_string() 
            },
            TransferError::NetworkError { 
                message: "test".to_string(), 
                context: None, 
                recoverable: true 
            },
        ];

        let pattern = NetworkErrorDetector::analyze_error_pattern(&checksum_errors);
        assert!(matches!(pattern, ErrorPattern::DataCorruption));
    }

    /// Test recovery suggestions
    #[test]
    fn test_recovery_suggestions() {
        // Test network error suggestion
        let network_error = TransferError::NetworkError {
            message: "Connection reset by peer".to_string(),
            context: Some("Connection reset".to_string()),
            recoverable: true,
        };

        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&network_error);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("reset"));

        // Test checksum mismatch suggestion
        let checksum_error = TransferError::ChecksumMismatch {
            expected: "abc123".to_string(),
            actual: "def456".to_string(),
            file_path: "test.txt".to_string(),
        };

        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&checksum_error);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("integrity"));

        // Test timeout suggestion
        let timeout_error = TransferError::Timeout {
            seconds: 30,
            operation: "connect".to_string(),
            recoverable: true,
        };

        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&timeout_error);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("timeout"));
    }

    /// Test retry logic for different error types
    #[tokio::test]
    async fn test_retry_logic() {
        let config = RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(10),
            max_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
            jitter: false,
        };

        let retry_handler = RetryHandler::new(config);

        // Test successful retry after network error
        let mut attempt_count = 0;
        let result = retry_handler.retry_with_backoff(|| {
            attempt_count += 1;
            async move {
                if attempt_count < 3 {
                    Err(TransferError::NetworkError {
                        message: "Temporary network error".to_string(),
                        context: None,
                        recoverable: true,
                    })
                } else {
                    Ok("Success".to_string())
                }
            }
        }).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Success");
        assert_eq!(attempt_count, 3);

        // Test non-recoverable error (should not retry)
        let mut attempt_count = 0;
        let result: Result<String, TransferError> = retry_handler.retry_with_backoff(|| {
            attempt_count += 1;
            async move {
                Err(TransferError::PermissionDenied {
                    operation: "file access".to_string(),
                    path: Some("/test".to_string()),
                })
            }
        }).await;

        assert!(result.is_err());
        assert_eq!(attempt_count, 1); // Should not retry non-recoverable errors
    }

    /// Test checksum mismatch handling
    #[test]
    fn test_checksum_mismatch_handling() {
        let checksum_error = TransferError::ChecksumMismatch {
            expected: "abc123def456".to_string(),
            actual: "xyz789uvw012".to_string(),
            file_path: "important_file.txt".to_string(),
        };

        // Should be recoverable
        assert!(checksum_error.is_recoverable());

        // Should have appropriate suggestion
        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&checksum_error);
        assert!(suggestion.is_some());
        let suggestion_text = suggestion.unwrap();
        assert!(suggestion_text.contains("important_file.txt"));
        assert!(suggestion_text.contains("abc123"));
        assert!(suggestion_text.contains("xyz789"));

        // Should allow limited retries
        assert!(ErrorRecoveryStrategies::should_auto_retry(&checksum_error, 1, 3));
        assert!(!ErrorRecoveryStrategies::should_auto_retry(&checksum_error, 2, 3)); // Only one retry for checksum
    }

    /// Test timeout handling with different operations
    #[test]
    fn test_timeout_handling() {
        // Connection timeout
        let connect_timeout = TransferError::Timeout {
            seconds: 10,
            operation: "TCP connect handshake".to_string(),
            recoverable: true,
        };

        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&connect_timeout);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("unreachable"));

        // Read timeout
        let read_timeout = TransferError::Timeout {
            seconds: 30,
            operation: "read data chunk".to_string(),
            recoverable: true,
        };

        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&read_timeout);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("slow"));

        // Write timeout
        let write_timeout = TransferError::Timeout {
            seconds: 30,
            operation: "write data chunk".to_string(),
            recoverable: true,
        };

        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&write_timeout);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("overloaded"));
    }

    /// Test retry delay calculation
    #[test]
    fn test_retry_delay_calculation() {
        let base_delay = Duration::from_secs(1);

        // Network error should use exponential backoff
        let network_error = TransferError::NetworkError {
            message: "test".to_string(),
            context: None,
            recoverable: true,
        };

        let delay1 = ErrorRecoveryStrategies::get_retry_delay(&network_error, 1, base_delay);
        let delay2 = ErrorRecoveryStrategies::get_retry_delay(&network_error, 2, base_delay);
        assert!(delay2 > delay1);

        // Rate limit should respect retry_after
        let rate_limit_error = TransferError::RateLimitExceeded {
            message: "Rate limited".to_string(),
            retry_after: Some(Duration::from_secs(5)),
        };

        let delay = ErrorRecoveryStrategies::get_retry_delay(&rate_limit_error, 1, base_delay);
        assert_eq!(delay, Duration::from_secs(5));
    }

    /// Test graceful degradation scenarios
    #[test]
    fn test_graceful_degradation() {
        // Test handling of unknown errors
        let unknown_error = TransferError::Unknown {
            message: "Something unexpected happened".to_string(),
            context: Some("test_context".to_string()),
        };

        assert!(!unknown_error.is_recoverable());
        
        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&unknown_error);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("test_context"));

        // Test handling of configuration errors
        let config_error = TransferError::ConfigError {
            message: "Invalid port number".to_string(),
            field: Some("port".to_string()),
        };

        assert!(!config_error.is_recoverable());
        
        let suggestion = ErrorRecoveryStrategies::get_recovery_suggestion(&config_error);
        assert!(suggestion.is_some());
        assert!(suggestion.unwrap().contains("port"));
    }

    /// Test error context preservation
    #[test]
    fn test_error_context_preservation() {
        let original_error = TransferError::NetworkError {
            message: "Original message".to_string(),
            context: None,
            recoverable: true,
        };

        let enhanced_error = original_error.with_context("Enhanced context".to_string());
        
        match enhanced_error {
            TransferError::NetworkError { context, .. } => {
                assert_eq!(context, Some("Enhanced context".to_string()));
            }
            _ => panic!("Error type should be preserved"),
        }
    }

    /// Test error serialization for frontend communication
    #[test]
    fn test_error_serialization() {
        let error = TransferError::ChecksumMismatch {
            expected: "abc123".to_string(),
            actual: "def456".to_string(),
            file_path: "test.txt".to_string(),
        };

        // Test that error can be serialized (for Tauri communication)
        let serialized = serde_json::to_string(&error);
        assert!(serialized.is_ok());

        let serialized_str = serialized.unwrap();
        assert!(serialized_str.contains("CHECKSUM_MISMATCH"));
        assert!(serialized_str.contains("abc123"));
        assert!(serialized_str.contains("test.txt"));
    }

    /// Test network connectivity checking
    #[tokio::test]
    async fn test_network_connectivity_check() {
        // Test invalid address
        let status = NetworkErrorDetector::check_network_connectivity(
            "invalid_address", 
            8080, 
            Duration::from_secs(1)
        ).await;
        
        assert!(matches!(status, crate::errors::NetworkStatus::InvalidAddress));

        // Test connection to non-existent service (should timeout or be refused)
        let status = NetworkErrorDetector::check_network_connectivity(
            "127.0.0.1", 
            9999, // Unlikely to be in use
            Duration::from_millis(100)
        ).await;
        
        assert!(matches!(
            status, 
            crate::errors::NetworkStatus::ConnectionRefused | 
            crate::errors::NetworkStatus::Timeout
        ));
    }

    /// Test error pattern recommendations
    #[test]
    fn test_error_pattern_recommendations() {
        let patterns = vec![
            ErrorPattern::NetworkInstability,
            ErrorPattern::SlowNetwork,
            ErrorPattern::TargetUnavailable,
            ErrorPattern::DataCorruption,
            ErrorPattern::Mixed,
            ErrorPattern::NoPattern,
        ];

        for pattern in patterns {
            let recommendation = NetworkErrorDetector::get_pattern_recovery_recommendation(&pattern);
            assert!(!recommendation.is_empty());
            
            match pattern {
                ErrorPattern::NetworkInstability => {
                    assert!(recommendation.contains("unstable") || recommendation.contains("wired"));
                }
                ErrorPattern::SlowNetwork => {
                    assert!(recommendation.contains("slow") || recommendation.contains("timeout"));
                }
                ErrorPattern::TargetUnavailable => {
                    assert!(recommendation.contains("unavailable") || recommendation.contains("running"));
                }
                ErrorPattern::DataCorruption => {
                    assert!(recommendation.contains("corruption") || recommendation.contains("TCP"));
                }
                _ => {} // Other patterns just need non-empty recommendations
            }
        }
    }
}