// UDP socket implementation module
pub mod udp_connection;
pub mod udp_file_sender;
pub mod udp_file_receiver;
pub mod udp_transfer;

// Re-export main types
pub use udp_connection::UdpConnection;
pub use udp_file_sender::UdpFileSender;
pub use udp_file_receiver::UdpFileReceiver;
pub use udp_transfer::UdpTransfer;

// Backward compatibility alias
pub use udp_connection::UdpConnection as UdpConnectionLegacy;