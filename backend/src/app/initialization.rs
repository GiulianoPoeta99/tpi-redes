// Application initialization
use crate::cli::{CliError, setup_logging};
use crate::core::api::initialize_orchestrator;
use tracing::error;

pub struct ApplicationInitializer;

impl ApplicationInitializer {
    pub async fn initialize(verbose: bool, debug: bool) -> Result<(), CliError> {
        // Initialize logging based on verbosity level
        setup_logging(verbose, debug);
        
        // Initialize the transfer orchestrator
        if let Err(e) = initialize_orchestrator().await {
            error!("Failed to initialize transfer orchestrator: {}", e);
            return Err(CliError::initialization(format!("Failed to initialize transfer orchestrator: {}", e)));
        }
        
        Ok(())
    }
}