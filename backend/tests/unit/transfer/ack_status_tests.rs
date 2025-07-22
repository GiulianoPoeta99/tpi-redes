#[cfg(test)]
mod tests {
    use crate::transfer::AckStatus;

    #[test]
    fn test_ack_status_methods() {
        assert!(AckStatus::Ok.is_success());
        assert!(!AckStatus::Retry.is_success());
        assert!(!AckStatus::Error.is_success());
        
        assert!(!AckStatus::Ok.needs_retry());
        assert!(AckStatus::Retry.needs_retry());
        assert!(!AckStatus::Error.needs_retry());
        
        assert!(!AckStatus::Ok.is_error());
        assert!(!AckStatus::Retry.is_error());
        assert!(AckStatus::Error.is_error());
    }
    
    #[test]
    fn test_ack_status_display() {
        assert_eq!(format!("{}", AckStatus::Ok), "ok");
        assert_eq!(format!("{}", AckStatus::Retry), "retry");
        assert_eq!(format!("{}", AckStatus::Error), "error");
    }
    
    #[test]
    fn test_ack_status_serialization() {
        // Test that the enum can be serialized and deserialized
        let status = AckStatus::Ok;
        let serialized = serde_json::to_string(&status).unwrap();
        let deserialized: AckStatus = serde_json::from_str(&serialized).unwrap();
        assert_eq!(status, deserialized);
        
        let status = AckStatus::Retry;
        let serialized = serde_json::to_string(&status).unwrap();
        let deserialized: AckStatus = serde_json::from_str(&serialized).unwrap();
        assert_eq!(status, deserialized);
        
        let status = AckStatus::Error;
        let serialized = serde_json::to_string(&status).unwrap();
        let deserialized: AckStatus = serde_json::from_str(&serialized).unwrap();
        assert_eq!(status, deserialized);
    }
}