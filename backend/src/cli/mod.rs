// CLI module
pub mod cli_error;
pub mod command_line_interface;
pub mod progress_monitor;
pub mod logging_setup;
pub mod handlers;

// Re-export main types
pub use cli_error::CliError;
pub use command_line_interface::{CommandLineInterface, Commands};
pub use logging_setup::setup_logging;