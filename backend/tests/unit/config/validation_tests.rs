#[cfg(test)]
mod validation_tests {
    use crate::errors::{ConfigValidator, TransferError};
    use std::time::Duration;

    #[test]
    fn test_port_validation() {
        // Valid ports
        assert!(ConfigValidator::validate_port(8080).is_ok());
        assert!(ConfigValidator::validate_port(1024).is_ok());
        assert!(ConfigValidator::validate_port(65535).is_ok());

        // Invalid ports
        assert!(ConfigValidator::validate_port(0).is_err());
    }

    #[test]
    fn test_ip_address_validation() {
        // Valid IP addresses
        assert!(ConfigValidator::validate_ip_address("127.0.0.1").is_ok());
        assert!(ConfigValidator::validate_ip_address("192.168.1.1").is_ok());
        assert!(ConfigValidator::validate_ip_address("localhost").is_ok());
        assert!(ConfigValidator::validate_ip_address("::1").is_ok());

        // Invalid IP addresses
        assert!(ConfigValidator::validate_ip_address("").is_err());
        assert!(ConfigValidator::validate_ip_address("invalid").is_err());
        assert!(ConfigValidator::validate_ip_address("999.999.999.999").is_err());
    }

    #[test]
    fn test_chunk_size_validation() {
        // Valid chunk sizes
        assert!(ConfigValidator::validate_chunk_size(1024).is_ok());
        assert!(ConfigValidator::validate_chunk_size(8192).is_ok());
        assert!(ConfigValidator::validate_chunk_size(65536).is_ok());

        // Invalid chunk sizes
        assert!(ConfigValidator::validate_chunk_size(0).is_err());
        assert!(ConfigValidator::validate_chunk_size(2 * 1024 * 1024).is_err()); // > 1MB
    }

    #[test]
    fn test_timeout_validation() {
        // Valid timeouts
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(1)).is_ok());
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(30)).is_ok());
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(300)).is_ok());

        // Invalid timeouts
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(0)).is_err());
        assert!(ConfigValidator::validate_timeout(Duration::from_secs(3601)).is_err()); // > 1 hour
    }
}