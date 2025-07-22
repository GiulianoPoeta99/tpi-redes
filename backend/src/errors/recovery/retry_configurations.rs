// Predefined retry configurations for common scenarios
use crate::errors::RetryConfiguration;
use std::time::Duration;

pub struct RetryConfigurations;

impl RetryConfigurations {
    /// Quick retry for network operations
    pub fn network_quick() -> RetryConfiguration {
        RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(5),
            backoff_multiplier: 2.0,
            jitter: true,
        }
    }

    /// Aggressive retry for critical operations
    pub fn aggressive() -> RetryConfiguration {
        RetryConfiguration {
            max_attempts: 5,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 2.0,
            jitter: true,
        }
    }

    /// Conservative retry for file operations
    pub fn file_operations() -> RetryConfiguration {
        RetryConfiguration {
            max_attempts: 2,
            initial_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(10),
            backoff_multiplier: 2.0,
            jitter: false,
        }
    }

    /// No retry for configuration errors
    pub fn no_retry() -> RetryConfiguration {
        RetryConfiguration {
            max_attempts: 1,
            initial_delay: Duration::from_millis(0),
            max_delay: Duration::from_millis(0),
            backoff_multiplier: 1.0,
            jitter: false,
        }
    }

    /// Standard retry for general operations
    pub fn standard() -> RetryConfiguration {
        RetryConfiguration {
            max_attempts: 3,
            initial_delay: Duration::from_millis(1000),
            max_delay: Duration::from_secs(15),
            backoff_multiplier: 1.5,
            jitter: true,
        }
    }

    /// Long retry for slow operations
    pub fn long_running() -> RetryConfiguration {
        RetryConfiguration {
            max_attempts: 10,
            initial_delay: Duration::from_secs(2),
            max_delay: Duration::from_secs(60),
            backoff_multiplier: 1.2,
            jitter: true,
        }
    }
}