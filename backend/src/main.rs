// CLI entry point
use clap::{Parser, Subcommand};
use file_transfer_backend::{TransferConfig, Protocol, TransferMode};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "file-transfer-cli")]
#[command(about = "A socket-based file transfer application")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Send a file to another machine
    Send {
        /// Target IP address
        #[arg(short, long)]
        target: String,
        
        /// Target port
        #[arg(short, long, default_value = "8080")]
        port: u16,
        
        /// Protocol to use (tcp or udp)
        #[arg(short = 'P', long, default_value = "tcp")]
        protocol: String,
        
        /// File to send
        file: PathBuf,
        
        /// Enable verbose logging
        #[arg(short, long)]
        verbose: bool,
    },
    /// Receive files from another machine
    Receive {
        /// Port to listen on
        #[arg(short, long, default_value = "8080")]
        port: u16,
        
        /// Protocol to use (tcp or udp)
        #[arg(short = 'P', long, default_value = "tcp")]
        protocol: String,
        
        /// Output directory for received files
        #[arg(short, long, default_value = ".")]
        output: PathBuf,
        
        /// Enable verbose logging
        #[arg(short, long)]
        verbose: bool,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Send { target, port, protocol, file, verbose } => {
            if verbose {
                tracing_subscriber::fmt()
                    .with_max_level(tracing::Level::DEBUG)
                    .init();
            } else {
                tracing_subscriber::fmt()
                    .with_max_level(tracing::Level::INFO)
                    .init();
            }
            
            let protocol = match protocol.as_str() {
                "tcp" => Protocol::Tcp,
                "udp" => Protocol::Udp,
                _ => {
                    eprintln!("Invalid protocol. Use 'tcp' or 'udp'");
                    std::process::exit(1);
                }
            };
            
            let config = TransferConfig {
                mode: TransferMode::Transmitter,
                protocol: protocol.clone(),
                target_ip: Some(target.clone()),
                port,
                filename: file.file_name().and_then(|n| n.to_str()).map(String::from),
                chunk_size: 8192,
                timeout: std::time::Duration::from_secs(30),
            };
            
            println!("Starting file transfer...");
            println!("File: {:?}", file);
            println!("Target: {}:{}", target, port);
            println!("Protocol: {:?}", protocol);
            
            // Implementation will be added in later tasks
            println!("CLI implementation will be completed in task 8");
        }
        Commands::Receive { port, protocol, output, verbose } => {
            if verbose {
                tracing_subscriber::fmt()
                    .with_max_level(tracing::Level::DEBUG)
                    .init();
            } else {
                tracing_subscriber::fmt()
                    .with_max_level(tracing::Level::INFO)
                    .init();
            }
            
            let protocol = match protocol.as_str() {
                "tcp" => Protocol::Tcp,
                "udp" => Protocol::Udp,
                _ => {
                    eprintln!("Invalid protocol. Use 'tcp' or 'udp'");
                    std::process::exit(1);
                }
            };
            
            println!("Starting file receiver...");
            println!("Port: {}", port);
            println!("Protocol: {:?}", protocol);
            println!("Output directory: {:?}", output);
            
            // Implementation will be added in later tasks
            println!("CLI implementation will be completed in task 8");
        }
    }
    
    Ok(())
}