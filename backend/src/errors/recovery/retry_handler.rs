// Exponential backoff retry utility
use crate::errors::{TransferError, RetryConfiguration};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{debug, error, warn};

#[derive(Clone)]
pub struct RetryHandler {
    config: RetryConfiguration,
}

impl RetryHandler {
    pub fn new(config: RetryConfiguration) -> Self {
        Self { config }
    }

    pub async fn retry_with_backoff<F, Fut, T>(&self, operation: F) -> Result<T, TransferError>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, TransferError>>,
    {
        let mut attempt = 0;
        let mut delay = self.config.initial_delay;

        loop {
            attempt += 1;
            
            match operation().await {
                Ok(result) => {
                    if attempt > 1 {
                        debug!("Operation succeeded after {} attempts", attempt);
                    }
                    return Ok(result);
                }
                Err(error) => {
                    if attempt >= self.config.max_attempts || !error.is_recoverable() {
                        error!("Operation failed after {} attempts: {}", attempt, error);
                        return Err(error);
                    }

                    warn!("Operation failed (attempt {}/{}): {}. Retrying in {:?}", 
                          attempt, self.config.max_attempts, error, delay);

                    sleep(delay).await;

                    // Calculate next delay with exponential backoff
                    delay = Duration::from_millis(
                        (delay.as_millis() as f64 * self.config.backoff_multiplier) as u64
                    );
                    
                    if delay > self.config.max_delay {
                        delay = self.config.max_delay;
                    }

                    // Add jitter to prevent thundering herd
                    if self.config.jitter {
                        let jitter_ms = (delay.as_millis() as f64 * 0.1 * rand::random::<f64>()) as u64;
                        delay = Duration::from_millis(delay.as_millis() as u64 + jitter_ms);
                    }
                }
            }
        }
    }
}