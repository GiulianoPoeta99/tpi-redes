#[cfg(test)]
mod transfer_config_tests {
    use crate::config::{TransferConfig, TransferMode, Protocol};
    use std::path::PathBuf;

    #[test]
    fn test_transfer_config_creation() {
        let config = TransferConfig::new(
            "127.0.0.1".to_string(),
            8080,
            Protocol::Tcp,
            TransferMode::Send,
            Some(PathBuf::from("test.txt")),
            None,
        );

        assert_eq!(config.address(), "127.0.0.1");
        assert_eq!(config.port(), 8080);
        assert_eq!(config.protocol(), &Protocol::Tcp);
        assert_eq!(config.mode(), &TransferMode::Send);
    }

    #[test]
    fn test_receive_mode_config() {
        let config = TransferConfig::new(
            "0.0.0.0".to_string(),
            9090,
            Protocol::Udp,
            TransferMode::Receive,
            None,
            Some(PathBuf::from("/tmp")),
        );

        assert_eq!(config.mode(), &TransferMode::Receive);
        assert_eq!(config.protocol(), &Protocol::Udp);
        assert_eq!(config.output_dir(), Some(&PathBuf::from("/tmp")));
    }

    #[test]
    fn test_config_validation() {
        // Test valid configuration
        let valid_config = TransferConfig::new(
            "192.168.1.1".to_string(),
            8080,
            Protocol::Tcp,
            TransferMode::Send,
            Some(PathBuf::from("Cargo.toml")),
            None,
        );

        // Basic validation - in a real implementation this would be more comprehensive
        assert!(!valid_config.address().is_empty());
        assert!(valid_config.port() > 0);
    }
}