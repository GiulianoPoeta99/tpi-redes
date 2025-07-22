// UDP connection management
use crate::config::TransferConfig;
use crate::errors::TransferError;
use std::net::SocketAddr;
use tokio::net::UdpSocket;
use uuid::Uuid;

pub struct UdpConnection {
    socket: Option<UdpSocket>,
    _config: TransferConfig,
    transfer_id: String,
}

impl UdpConnection {
    pub fn new(config: TransferConfig) -> Self {
        Self {
            socket: None,
            _config: config,
            transfer_id: Uuid::new_v4().to_string(),
        }
    }
    
    pub fn transfer_id(&self) -> &str {
        &self.transfer_id
    }
    
    pub async fn bind(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        let socket = UdpSocket::bind(addr).await.map_err(|e| TransferError::NetworkError {
            message: format!("Failed to bind UDP socket to {}: {}", addr, e),
            context: Some(addr.to_string()),
            recoverable: false,
        })?;
        
        self.socket = Some(socket);
        Ok(())
    }
    
    pub fn get_socket(&self) -> Option<&UdpSocket> {
        self.socket.as_ref()
    }
}