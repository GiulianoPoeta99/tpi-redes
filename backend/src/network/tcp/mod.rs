// TCP socket implementation module
pub mod tcp_connection;
pub mod tcp_file_sender;
pub mod tcp_file_receiver;

// Re-export main types
pub use tcp_connection::TcpConnection;
pub use tcp_file_sender::TcpFileSender;
pub use tcp_file_receiver::TcpFileReceiver;

// Alias for backward compatibility
pub use tcp_connection::TcpConnection as TcpTransfer;