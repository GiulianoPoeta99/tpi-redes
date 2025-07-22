// UDP socket implementation module
pub mod udp_connection;
pub mod udp_file_sender;
pub mod udp_file_receiver;

// Re-export main types
pub use udp_connection::UdpConnection;
pub use udp_file_sender::UdpFileSender;
pub use udp_file_receiver::UdpFileReceiver;

// Alias for backward compatibility
pub use udp_connection::UdpConnection as UdpTransfer;