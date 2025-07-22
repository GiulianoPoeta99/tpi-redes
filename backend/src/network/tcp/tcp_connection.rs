// TCP connection management
use crate::config::TransferConfig;
use crate::errors::TransferError;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;
use uuid::Uuid;

pub struct TcpConnection {
    socket: Option<TcpStream>,
    config: TransferConfig,
    transfer_id: String,
}

impl TcpConnection {
    pub fn new(config: TransferConfig) -> Self {
        Self {
            socket: None,
            config,
            transfer_id: Uuid::new_v4().to_string(),
        }
    }
    
    pub fn transfer_id(&self) -> &str {
        &self.transfer_id
    }
    
    pub fn set_socket(&mut self, socket: TcpStream) {
        self.socket = Some(socket);
    }
    
    /// Connect to a remote TCP server with timeout handling
    pub async fn connect(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        let connect_future = TcpStream::connect(addr);
        
        match timeout(self.config.timeout, connect_future).await {
            Ok(Ok(stream)) => {
                self.socket = Some(stream);
                Ok(())
            }
            Ok(Err(e)) => Err(TransferError::NetworkError {
                message: format!("Failed to connect to {}: {}", addr, e),
                context: Some(addr.to_string()),
                recoverable: true,
            }),
            Err(_) => Err(TransferError::Timeout {
                seconds: self.config.timeout.as_secs(),
                operation: format!("TCP connect to {}", addr),
                recoverable: true,
            }),
        }
    }
    
    /// Create a TCP listener
    pub async fn listen(addr: SocketAddr) -> Result<TcpListener, TransferError> {
        TcpListener::bind(addr).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to bind TCP listener to {}: {}", addr, e),
            context: Some(addr.to_string()),
            recoverable: false,
        })
    }
    
    /// Accept a connection with timeout
    pub async fn accept_connection(
        listener: &TcpListener,
        timeout_duration: Duration,
    ) -> Result<(TcpStream, SocketAddr), TransferError> {
        let accept_future = listener.accept();
        
        match timeout(timeout_duration, accept_future).await {
            Ok(Ok((stream, addr))) => Ok((stream, addr)),
            Ok(Err(e)) => Err(TransferError::NetworkError {
                message: format!("Failed to accept TCP connection: {}", e),
                context: None,
                recoverable: true,
            }),
            Err(_) => Err(TransferError::Timeout {
                seconds: timeout_duration.as_secs(),
                operation: "TCP accept connection".to_string(),
                recoverable: true,
            }),
        }
    }
    
    pub fn get_socket(&mut self) -> Option<&mut TcpStream> {
        self.socket.as_mut()
    }
}