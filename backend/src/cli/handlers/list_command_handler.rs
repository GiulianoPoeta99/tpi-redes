// List command handler
use crate::cli::CliError;
use crate::config::TransferMode;
use crate::core::api::get_active_transfers;

pub async fn handle_list_command() -> Result<i32, CliError> {
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