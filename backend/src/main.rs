// CLI entry point
mod app;
mod cli;
mod config;
mod errors;
mod sockets;
mod transfer;
mod crypto;
mod utils;

use app::ApplicationRunner;
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