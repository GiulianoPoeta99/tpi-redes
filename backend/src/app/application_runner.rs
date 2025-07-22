// Application execution logic
use crate::app::{Application, ApplicationInitializer};
use crate::cli::{CliError, CommandLineInterface};

pub struct ApplicationRunner;

impl ApplicationRunner {
    pub async fn run_with_cli(cli: CommandLineInterface) -> Result<i32, CliError> {
        // Initialize application
        ApplicationInitializer::initialize(cli.verbose, cli.debug).await?;
        
        // Create and run application
        let app = Application::new(cli);
        app.run().await
    }
    
    pub async fn run() -> Result<i32, CliError> {
        let cli = crate::app::CliParser::parse();
        Self::run_with_cli(cli).await
    }
}