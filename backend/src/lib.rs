// Library exports for Tauri integration
#![allow(dead_code)]
#![allow(unused_imports)]

pub mod config;
pub mod crypto;
pub mod utils;
pub mod errors;
pub mod core;
pub mod network;
pub mod app;
pub mod cli;

// #[cfg(test)]
// mod tests;

// Re-export everything through core public API
pub use core::*;