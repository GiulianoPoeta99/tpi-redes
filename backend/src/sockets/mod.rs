// Socket implementations module
pub mod tcp;
pub mod udp;

// Re-export main types
pub use tcp::TcpTransfer;
pub use udp::UdpTransfer;