// Exponential backoff retry utility
use crate::errors::{TransferError, RetryConfiguration};
use crate::errors::recovery::error_recovery_strategies::ErrorRecoveryStrategies;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, warn, info};

#[derive(Clone)]
pub struct RetryHandler {
    config: RetryConfiguration,
}

impl RetryHandler {
    pub fn new(config: RetryConfiguration) -> Self {
        Self { config }
    }

    pub async fn retry_with_backoff<F, Fut, T>(&self, mut operation: F) -> Result<T, TransferError>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, TransferError>>,
    {
        self.retry_with_custom_strategy(operation, None).await
    }

    pub async fn retry_with_custom_strategy<F, Fut, T>(
        &self,
        mut operation: F,
        should_retry_fn: impl Fn(&TransferError, u32) -> bool,
    ) -> Result<T, TransferError>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, TransferError>>,
    {
        let mut attempt = 0;

        loop {
            attempt += 1;
            
            match operation().await {
                Ok(result) => {
                    if attempt > 1 {
                        info!("Operation succeeded after {} attempts", attempt);
                    }
                    return Ok(result);
                }
                Err(error) => {
                    // Check if we should retry
                    let should_retry = should_retry_fn(&error, attempt);

                    if !should_retry {
                        error!("Operation failed after {} attempts: {}", attempt, error);
                        if let Some(suggestion) = ErrorRecoveryStrategies::get_recovery_suggestion(&error) {
                            error!("Recovery suggestion: {}", suggestion);
                        }
                        return Err(error);
                    }

                    // Calculate delay for next attempt
                    let delay = ErrorRecoveryStrategies::get_retry_delay(&error, attempt, self.config.initial_delay);
                    
                    warn!("Operation failed (attempt {}/{}): {}. Retrying in {:?}", 
                          attempt, self.config.max_attempts, error, delay);
                    
                    if let Some(suggestion) = ErrorRecoveryStrategies::get_recovery_suggestion(&error) {
                        debug!("Recovery suggestion: {}", suggestion);
                    }

                    sleep(delay).await;
                }
            }
        }
    }

    /// Retry with checksum mismatch handling
    pub async fn retry_with_checksum_recovery<F, Fut, T>(
        &self,
        mut operation: F,
    ) -> Result<T, TransferError>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, TransferError>>,
    {
        let config = RetryConfiguration {
            max_attempts: 2,
            initial_delay: Duration::from_millis(1000),
            max_delay: Duration::from_secs(3),
            backoff_multiplier: 1.0,
            jitter: false,
        };
        
        let handler = RetryHandler::new(config);
        handler.retry_with_backoff(operation).await
    }

    /// Retry with network error detection and recovery
    pub async fn retry_network_operation<F, Fut, T>(&self, mut operation: F) -> Result<T, TransferError>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, TransferError>>,
    {
        let config = RetryConfiguration {
            max_attempts: 5,
            initial_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(10),
            backoff_multiplier: 1.5,
            jitter: true,
        };
        
        let handler = RetryHandler::new(config);
        handler.retry_with_backoff(operation).await
    }

    /// Create a retry handler with specific configuration for different error types
    pub fn for_network_operations() -> Self {
        let config = RetryConfiguration {
            max_attempts: 5,
            initial_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(10),
            backoff_multiplier: 1.5,
            jitter: true,
        };
        Self::new(config)
    }

    pub fn for_file_operations() -> Self {
        let config = RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(5),
            backoff_multiplier: 2.0,
            jitter: false,
        };
        Self::new(config)
    }

    pub fn for_checksum_verification() -> Self {
        let config = RetryConfiguration {
            max_attempts: 2,
            initial_delay: Duration::from_millis(1000),
            max_delay: Duration::from_secs(3),
            backoff_multiplier: 1.0,
            jitter: false,
        };
        Self::new(config)
    }
}