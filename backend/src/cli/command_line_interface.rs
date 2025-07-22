// Command line interface definition
use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "file-transfer-cli")]
#[command(about = "A socket-based file transfer application")]
#[command(version = "0.1.0")]
pub struct CommandLineInterface {
    #[command(subcommand)]
    pub command: Commands,
    
    /// Enable verbose logging
    #[arg(short, long, global = true)]
    pub verbose: bool,
    
    /// Enable debug logging (implies verbose)
    #[arg(short, long, global = true)]
    pub debug: bool,
}

#[derive(Subcommand)]
pub enum Commands {
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
        
        /// Chunk size in bytes
        #[arg(short, long, default_value = "8192")]
        chunk_size: usize,
        
        /// Connection timeout in seconds
        #[arg(short = 'T', long, default_value = "30")]
        timeout: u64,
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
        
        /// Connection timeout in seconds
        #[arg(short = 'T', long, default_value = "30")]
        timeout: u64,
    },
    /// List active transfers
    List,
    /// Cancel a transfer by ID
    Cancel {
        /// Transfer ID to cancel
        transfer_id: String,
    },
}