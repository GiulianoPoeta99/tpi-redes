// Progress monitoring for CLI
use crate::cli::CliError;
use crate::core::transfer::TransferStatus;
use crate::core::api::get_transfer_progress;
use std::io::Write;
use std::time::{Duration, Instant};
use tokio::time::{interval, sleep};
use tracing::debug;

pub async fn monitor_transfer_progress(transfer_id: &str) -> Result<i32, CliError> {
    let mut interval = interval(Duration::from_millis(500));
    let mut last_progress = 0.0;
    let start_time = Instant::now();
    
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
            std::io::stdout().flush()?;
            
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
            TransferStatus::Transferring => {
                // Special case for UDP: if progress is 100% and we haven't seen progress change for a while,
                // consider it completed (UDP is fire-and-forget)
                if progress.progress >= 1.0 {
                    // Wait a bit more to see if status changes to Completed
                    sleep(Duration::from_millis(1000)).await;
                    
                    // Check again
                    let final_progress = match get_transfer_progress(transfer_id.to_string()).await {
                        Ok(p) => p,
                        Err(_) => progress.clone(),
                    };
                    
                    if final_progress.status == TransferStatus::Completed {
                        println!("\n✓ Transfer completed successfully!");
                        let duration = start_time.elapsed();
                        println!("Total time: {}", format_duration(duration.as_secs()));
                        return Ok(0);
                    } else if final_progress.progress >= 1.0 {
                        // Still at 100% but not marked as completed - assume UDP completed
                        println!("\n✓ Transfer completed successfully! (UDP fire-and-forget)");
                        let duration = start_time.elapsed();
                        println!("Total time: {}", format_duration(duration.as_secs()));
                        return Ok(0);
                    }
                }
                // Continue monitoring
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