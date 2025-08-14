// Error handling module
pub mod transfer_error;
pub mod error_utilities;
pub mod error_context;
pub mod config_validator;
pub mod error_collector;
pub mod network_error_detector;
pub mod helpers;
pub mod recovery;

#[cfg(test)]
mod error_scenario_tests;

// Re-export main types
pub use transfer_error::TransferError;
pub use error_context::ErrorContext;
pub use config_validator::ConfigValidator;
pub use error_collector::ErrorCollector;
pub use network_error_detector::{NetworkErrorDetector, NetworkStatus, ErrorPattern};
pub use helpers::*;
pub use recovery::*;