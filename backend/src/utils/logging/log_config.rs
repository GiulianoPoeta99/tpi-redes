// Logging configuration
use tracing::Level;

#[derive(Debug, Clone)]
pub struct LogConfig {
    pub level: Level,
    pub show_target: bool,
    pub show_thread_ids: bool,
    pub show_file_location: bool,
    pub show_spans: bool,
    pub json_format: bool,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            level: Level::INFO,
            show_target: false,
            show_thread_ids: true,
            show_file_location: true,
            show_spans: false,
            json_format: false,
        }
    }
}

impl LogConfig {
    pub fn verbose() -> Self {
        Self {
            level: Level::DEBUG,
            show_target: true,
            show_thread_ids: true,
            show_file_location: true,
            show_spans: true,
            json_format: false,
        }
    }

    pub fn quiet() -> Self {
        Self {
            level: Level::WARN,
            show_target: false,
            show_thread_ids: false,
            show_file_location: false,
            show_spans: false,
            json_format: false,
        }
    }

    pub fn json() -> Self {
        Self {
            json_format: true,
            ..Default::default()
        }
    }
}