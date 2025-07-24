// CLI entry point
#![allow(dead_code)]
#![allow(unused_imports)]

mod app;
mod cli;
mod config;
mod errors;
mod network;
mod core;
mod crypto;
mod utils;

use app::ApplicationRunner;
#[allow(unused_imports)]
use cli::CliError;

#[tokio::main]
async fn main() {
    match ApplicationRunner::run().await {
        Ok(exit_code) => std::process::exit(exit_code),
        Err(e) => {
            eprintln!("Application error: {}", e);
            std::process::exit(e.exit_code());
        }
    }
}