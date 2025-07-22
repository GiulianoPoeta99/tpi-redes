// Main application structure
use crate::cli::{CliError, CommandLineInterface, Commands};
use crate::cli::handlers::{
    handle_send_command, handle_receive_command, 
    handle_list_command, handle_cancel_command
};
// use tracing::error;

pub struct Application {
    cli: CommandLineInterface,
}

impl Application {
    pub fn new(cli: CommandLineInterface) -> Self {
        Self { cli }
    }

    pub async fn run(self) -> Result<i32, CliError> {
        let result = match self.cli.command {
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
        
        result
    }
}