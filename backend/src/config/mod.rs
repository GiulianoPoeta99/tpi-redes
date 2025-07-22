// Configuration management module
pub mod transfer_config;
pub mod protocol;
pub mod transfer_mode;
pub mod validation;

// Re-export main types
pub use transfer_config::TransferConfig;
pub use protocol::Protocol;
pub use transfer_mode::TransferMode;