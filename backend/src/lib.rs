//! # File Transfer Library
//!
//! A high-performance, cross-platform file transfer library supporting both TCP and UDP protocols.
//! This library provides the core functionality for the File Transfer Application, designed to be
//! used by both the CLI interface and the Tauri desktop application.
//!
//! ## Features
//!
//! - **Dual Protocol Support**: TCP (reliable) and UDP (fire-and-forget) implementations
//! - **File Integrity**: SHA-256 checksum verification for TCP transfers
//! - **Real-time Progress**: Live transfer monitoring with speed and ETA calculations
//! - **Error Recovery**: Automatic retry logic with exponential backoff
//! - **Cross-platform**: Works on Windows, macOS, and Linux
//! - **Memory Efficient**: Streaming file processing with constant memory usage
//!
//! ## Quick Start
//!
//! ```rust
//! use file_transfer_backend::*;
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     // Configure transfer
//!     let config = TransferConfig {
//!         mode: TransferMode::Transmitter,
//!         protocol: Protocol::Tcp,
//!         target_ip: Some("192.168.1.100".to_string()),
//!         port: 8080,
//!         ..Default::default()
//!     };
//!     
//!     // Start transfer
//!     let transfer_id = start_file_transfer(
//!         config,
//!         "myfile.txt".to_string(),
//!         "192.168.1.100:8080".to_string()
//!     ).await?;
//!     
//!     // Monitor progress
//!     while let Some(progress) = get_transfer_progress(&transfer_id) {
//!         println!("Progress: {:.1}%", progress.progress * 100.0);
//!         if matches!(progress.status, TransferStatus::Completed | TransferStatus::Failed) {
//!             break;
//!         }
//!         tokio::time::sleep(std::time::Duration::from_millis(100)).await;
//!     }
//!     
//!     Ok(())
//! }
//! ```
//!
//! ## Architecture
//!
//! The library is organized into several modules:
//!
//! - [`config`]: Configuration management and validation
//! - [`core`]: Core transfer logic and orchestration
//! - [`network`]: TCP and UDP protocol implementations
//! - [`crypto`]: Cryptographic functions (checksums, hashing)
//! - [`errors`]: Error types and recovery strategies
//! - [`utils`]: Utility functions and helpers
//!
//! ## Protocol Implementations
//!
//! ### TCP (Reliable Transfer)
//! - Connection-oriented with proper handshake
//! - 8KB chunks with acknowledgment for each chunk
//! - File metadata exchange before data transfer
//! - SHA-256 integrity verification
//! - Automatic error detection and recovery
//!
//! ### UDP (Fire-and-Forget)
//! - Connectionless, no handshake required
//! - 1KB chunks sent continuously without acknowledgment
//! - No metadata exchange or integrity checking
//! - Completion detected via timeout mechanism
//! - Optimized for speed over reliability

#![deny(missing_docs)]
#![warn(clippy::all)]
#![allow(dead_code)]
#![allow(unused_imports)]

/// Configuration management and validation
pub mod config;

/// Cryptographic functions and file integrity verification
pub mod crypto;

/// Utility functions, logging, and helpers
pub mod utils;

/// Error types, recovery strategies, and error handling
pub mod errors;

/// Core transfer logic, orchestration, and session management
pub mod core;

/// Network protocol implementations (TCP and UDP)
pub mod network;

/// Application initialization and lifecycle management
pub mod app;

/// Command-line interface implementation
pub mod cli;

// Re-export the public API through the core module
// This provides a clean, unified interface for library consumers
pub use core::api::*;