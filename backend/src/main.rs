// CLI entry point
use clap::{Parser, Subcommand};
use file_transfer_backend::{
    TransferConfig, Protocol, TransferMode, TransferStatus,
    initialize_orchestrator, start_file_transfer, start_file_receiver,
    get_transfer_progress, cancel_transfer, get_active_transfers,
};
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::{interval, sleep};
use tracing::{debug, error, info};

#[derive(Parser)]
#[command(name = "file-transfer-cli")]
#[command(about = "A socket-based file transfer application")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// Enable verbose logging
    #[arg(short, long, global = true)]
    verbose: bool,
    
    /// Enable debug logging (implies verbose)
    #[arg(short, long, global = true)]
    debug: bool,
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    
    // Initialize logging based on verbosity level
    setup_logging(cli.verbose, cli.debug);
    
    // Initialize the transfer orchestrator
    if let Err(e) = initialize_orchestrator().await {
        error!("Failed to initialize transfer orchestrator: {}", e);
        std::process::exit(1);
    }
    
    let result = match cli.command {
        Commands::Send { target, port, protocol, file, chunk_size, timeout } => {
            handle_send_command(target, port, protocol, file, chunk_size, timeout).await
        }
        Commands::Receive { port, protocol, output, timeout } => {
            handle_receive_command(port, protocol, output, timeout).await
        }
        Commands::List => {
            handle_list_command().await
        }
        Commands::Cancel { transfer_id } => {
            handle_cancel_command(transfer_id).await
        }
    };
    
    match result {
        Ok(exit_code) => std::process::exit(exit_code),
        Err(e) => {
            error!("Command failed: {}", e);
            std::process::exit(1);
        }
    }
}

fn setup_logging(verbose: bool, debug: bool) {
    let level = if debug {
        tracing::Level::DEBUG
    } else if verbose {
        tracing::Level::INFO
    } else {
        tracing::Level::WARN
    };
    
    tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .with_thread_ids(debug)
        .with_file(debug)
        .with_line_number(debug)
        .init();
}

async fn handle_send_command(
    target: String,
    port: u16,
    protocol: String,
    file: PathBuf,
    chunk_size: usize,
    timeout: u64,
) -> Result<i32, Box<dyn std::error::Error>> {
    // Validate file exists and is readable
    if !file.exists() {
        eprintln!("Error: File does not exist: {}", file.display());
        return Ok(1);
    }
    
    if !file.is_file() {
        eprintln!("Error: Path is not a file: {}", file.display());
        return Ok(1);
    }
    
    // Parse protocol
    let protocol = match protocol.as_str() {
        "tcp" => Protocol::Tcp,
        "udp" => Protocol::Udp,
        _ => {
            eprintln!("Error: Invalid protocol '{}'. Use 'tcp' or 'udp'", protocol);
            return Ok(1);
        }
    };
    
    // Create configuration
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: protocol.clone(),
        target_ip: Some(target.clone()),
        port,
        filename: file.file_name().and_then(|n| n.to_str()).map(String::from),
        chunk_size,
        timeout: Duration::from_secs(timeout),
    };
    
    // Validate configuration
    if let Err(e) = config.validate() {
        eprintln!("Error: Configuration validation failed: {}", e);
        return Ok(1);
    }
    
    // Get file metadata for display
    let metadata = tokio::fs::metadata(&file).await?;
    let file_size = metadata.len();
    let filename = file.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    
    println!("Starting file transfer...");
    println!("  File: {} ({} bytes)", filename, file_size);
    println!("  Target: {}:{}", target, port);
    println!("  Protocol: {:?}", protocol);
    println!("  Chunk size: {} bytes", chunk_size);
    println!("  Timeout: {}s", timeout);
    println!();
    
    // Start the transfer
    let target_address = format!("{}:{}", target, port);
    let transfer_id = match start_file_transfer(config, file.display().to_string(), target_address).await {
        Ok(id) => {
            info!("Transfer started with ID: {}", id);
            id
        }
        Err(e) => {
            eprintln!("Error: Failed to start transfer: {}", e);
            return Ok(1);
        }
    };
    
    // Monitor progress
    monitor_transfer_progress(&transfer_id).await
}

async fn handle_receive_command(
    port: u16,
    protocol: String,
    output: PathBuf,
    timeout: u64,
) -> Result<i32, Box<dyn std::error::Error>> {
    // Validate output directory
    if !output.exists() {
        if let Err(e) = tokio::fs::create_dir_all(&output).await {
            eprintln!("Error: Failed to create output directory: {}", e);
            return Ok(1);
        }
    }
    
    if !output.is_dir() {
        eprintln!("Error: Output path is not a directory: {}", output.display());
        return Ok(1);
    }
    
    // Parse protocol
    let protocol = match protocol.as_str() {
        "tcp" => Protocol::Tcp,
        "udp" => Protocol::Udp,
        _ => {
            eprintln!("Error: Invalid protocol '{}'. Use 'tcp' or 'udp'", protocol);
            return Ok(1);
        }
    };
    
    println!("Starting file receiver...");
    println!("  Port: {}", port);
    println!("  Protocol: {:?}", protocol);
    println!("  Output directory: {}", output.display());
    println!("  Timeout: {}s", timeout);
    println!();
    println!("Waiting for incoming connections...");
    
    // Start the receiver
    let transfer_id = match start_file_receiver(port, protocol, output.display().to_string()).await {
        Ok(id) => {
            info!("Receiver started with ID: {}", id);
            id
        }
        Err(e) => {
            eprintln!("Error: Failed to start receiver: {}", e);
            return Ok(1);
        }
    };
    
    // Monitor progress
    monitor_transfer_progress(&transfer_id).await
}

async fn handle_list_command() -> Result<i32, Box<dyn std::error::Error>> {
    let transfers = get_active_transfers().await?;
    
    if transfers.is_empty() {
        println!("No active transfers");
        return Ok(0);
    }
    
    println!("Active transfers:");
    println!("{:<36} {:<12} {:<8} {:<15} {:<10}", "ID", "Status", "Progress", "Speed", "Mode");
    println!("{}", "-".repeat(80));
    
    for transfer in transfers {
        let progress_pct = (transfer.progress.progress * 100.0) as u32;
        let speed = format_speed(transfer.progress.speed);
        let mode = match transfer.config.mode {
            TransferMode::Transmitter => "Send",
            TransferMode::Receiver => "Receive",
        };
        
        println!(
            "{:<36} {:<12} {:>7}% {:<15} {:<10}",
            transfer.id,
            format!("{:?}", transfer.status),
            progress_pct,
            speed,
            mode
        );
    }
    
    Ok(0)
}

async fn handle_cancel_command(transfer_id: String) -> Result<i32, Box<dyn std::error::Error>> {
    match cancel_transfer(transfer_id.clone()).await {
        Ok(()) => {
            println!("Transfer {} cancelled successfully", transfer_id);
            Ok(0)
        }
        Err(e) => {
            eprintln!("Error: Failed to cancel transfer {}: {}", transfer_id, e);
            Ok(1)
        }
    }
}

async fn monitor_transfer_progress(transfer_id: &str) -> Result<i32, Box<dyn std::error::Error>> {
    let mut interval = interval(Duration::from_millis(500));
    let mut last_progress = 0.0;
    let _last_bytes = 0u64;
    let start_time = std::time::Instant::now();
    
    loop {
        interval.tick().await;
        
        let progress = match get_transfer_progress(transfer_id.to_string()).await {
            Ok(p) => p,
            Err(e) => {
                debug!("Failed to get progress: {}", e);
                continue;
            }
        };
        
        // Update progress display
        if progress.progress != last_progress {
            let progress_pct = (progress.progress * 100.0) as u32;
            let speed = format_speed(progress.speed);
            let eta = format_duration(progress.eta);
            
            print!("\r\x1b[K"); // Clear line
            print!("Progress: {:>3}% | Speed: {:>10} | ETA: {:>8} | Status: {:?}", 
                   progress_pct, speed, eta, progress.status);
            std::io::Write::flush(&mut std::io::stdout())?;
            
            last_progress = progress.progress;
        }
        
        // Check if transfer is complete
        match progress.status {
            TransferStatus::Completed => {
                println!("\n✓ Transfer completed successfully!");
                let duration = start_time.elapsed();
                println!("Total time: {}", format_duration(duration.as_secs()));
                if let Some(error) = progress.error {
                    println!("Final status: {}", error);
                }
                return Ok(0);
            }
            TransferStatus::Error => {
                println!("\n✗ Transfer failed!");
                if let Some(error) = progress.error {
                    eprintln!("Error: {}", error);
                }
                return Ok(1);
            }
            TransferStatus::Idle => {
                // Transfer might have been cancelled or not started
                sleep(Duration::from_millis(100)).await;
            }
            _ => {
                // Continue monitoring
            }
        }
        
        // Safety check - if we've been running for too long without progress, exit
        if start_time.elapsed() > Duration::from_secs(300) && progress.progress == 0.0 {
            println!("\n⚠ Transfer appears to be stuck. Exiting...");
            return Ok(1);
        }
    }
}

fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec < 1024.0 {
        format!("{:.1} B/s", bytes_per_sec)
    } else if bytes_per_sec < 1024.0 * 1024.0 {
        format!("{:.1} KB/s", bytes_per_sec / 1024.0)
    } else if bytes_per_sec < 1024.0 * 1024.0 * 1024.0 {
        format!("{:.1} MB/s", bytes_per_sec / (1024.0 * 1024.0))
    } else {
        format!("{:.1} GB/s", bytes_per_sec / (1024.0 * 1024.0 * 1024.0))
    }
}

fn format_duration(seconds: u64) -> String {
    if seconds < 60 {
        format!("{}s", seconds)
    } else if seconds < 3600 {
        format!("{}m{}s", seconds / 60, seconds % 60)
    } else {
        format!("{}h{}m", seconds / 3600, (seconds % 3600) / 60)
    }
}