// Cancel command handler
use crate::cli::CliError;
use crate::core::api::cancel_transfer;

pub async fn handle_cancel_command(transfer_id: String) -> Result<i32, CliError> {
    match cancel_transfer(transfer_id.clone()).await {
        Ok(()) => {
            println!("Transfer {} cancelled successfully", transfer_id);
            Ok(0)
        }
        Err(e) => {
            Err(CliError::Transfer(e))
        }
    }
}