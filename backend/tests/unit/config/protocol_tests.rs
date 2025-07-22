#[cfg(test)]
mod protocol_tests {
    use crate::config::Protocol;

    #[test]
    fn test_protocol_display() {
        assert_eq!(format!("{}", Protocol::Tcp), "TCP");
        assert_eq!(format!("{}", Protocol::Udp), "UDP");
    }

    #[test]
    fn test_protocol_equality() {
        assert_eq!(Protocol::Tcp, Protocol::Tcp);
        assert_eq!(Protocol::Udp, Protocol::Udp);
        assert_ne!(Protocol::Tcp, Protocol::Udp);
    }

    #[test]
    fn test_protocol_clone() {
        let tcp = Protocol::Tcp;
        let tcp_clone = tcp.clone();
        assert_eq!(tcp, tcp_clone);

        let udp = Protocol::Udp;
        let udp_clone = udp.clone();
        assert_eq!(udp, udp_clone);
    }
}