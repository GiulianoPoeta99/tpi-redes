// Socket implementations module
pub mod tcp;
pub mod udp;
pub mod socket_transfer;
pub mod tcp_transfer_wrapper;
pub mod udp_transfer_wrapper;

// Re-export main types
pub use socket_transfer::SocketTransfer;
pub use tcp_transfer_wrapper::TcpTransferWrapper;
pub use udp_transfer_wrapper::UdpTransferWrapper;
pub use tcp::{TcpConnection, TcpTransfer};
pub use udp::{UdpConnection, UdpTransfer, UdpFileSender, UdpFileReceiver};