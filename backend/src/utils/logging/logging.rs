// Logging utilities with structured logging
use crate::utils::LogConfig;
use tracing::{info, Span};
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
    Layer,
};



/// Initialize structured logging system
pub fn init_logging(config: LogConfig) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let env_filter = EnvFilter::builder()
        .with_default_directive(config.level.into())
        .from_env_lossy()
        .add_directive("file_transfer_backend=trace".parse()?)
        .add_directive("tokio=info".parse()?)
        .add_directive("hyper=info".parse()?);

    let fmt_layer = if config.json_format {
        fmt::layer()
            .with_target(config.show_target)
            .with_thread_ids(config.show_thread_ids)
            .with_file(config.show_file_location)
            .with_line_number(config.show_file_location)
            .boxed()
    } else {
        let mut layer = fmt::layer()
            .with_target(config.show_target)
            .with_thread_ids(config.show_thread_ids)
            .with_file(config.show_file_location)
            .with_line_number(config.show_file_location);

        if config.show_spans {
            layer = layer.with_span_events(FmtSpan::ENTER | FmtSpan::CLOSE);
        }

        layer.boxed()
    };

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .try_init()?;

    info!("Logging initialized with level: {:?}", config.level);
    Ok(())
}

/// Initialize simple logging for CLI usage
pub fn init_simple_logging(verbose: bool) {
    let config = if verbose {
        LogConfig::verbose()
    } else {
        LogConfig::default()
    };

    if let Err(e) = init_logging(config) {
        eprintln!("Failed to initialize logging: {}", e);
    }
}



/// Create a span for transfer operations
pub fn create_transfer_span(transfer_id: &str, operation: &str) -> Span {
    tracing::info_span!(
        "transfer_operation",
        transfer_id = transfer_id,
        operation = operation
    )
}

/// Create a span for network operations
pub fn create_network_span(protocol: &str, address: &str, operation: &str) -> Span {
    tracing::debug_span!(
        "network_operation",
        protocol = protocol,
        address = address,
        operation = operation
    )
}

/// Create a span for file operations
pub fn create_file_span(operation: &str, path: &str) -> Span {
    tracing::debug_span!(
        "file_operation",
        operation = operation,
        path = path
    )
}