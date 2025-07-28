// Unified socket transfer interface
use crate::config::{TransferConfig, Protocol};
use crate::errors::TransferError;
use crate::network::tcp::{TcpConnection, TcpFileSender, TcpFileReceiver};
use crate::network::udp::{UdpFileSender, UdpFileReceiver};
use crate::network::{TcpTransferWrapper, UdpTransferWrapper};
use crate::core::transfer::{TransferProgress, TransferResult};
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;

pub enum SocketTransfer {
    Tcp(TcpTransferWrapper),
    Udp(UdpTransferWrapper),
}

impl SocketTransfer {
    pub fn new(config: TransferConfig) -> Self {
        match config.protocol {
            Protocol::Tcp => {
                let sender = TcpFileSender::new(config.clone());
                let receiver = TcpFileReceiver::new(config);
                Self::Tcp(TcpTransferWrapper::new(sender, receiver))
            }
            Protocol::Udp => {
                let sender = UdpFileSender::new(config.clone());
                let receiver = UdpFileReceiver::new(config);
                Self::Udp(UdpTransferWrapper::new(sender, receiver))
            }
        }
    }
    
    pub async fn connect(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        match self {
            Self::Tcp(wrapper) => {
                if let Some(sender) = wrapper.sender_mut() {
                    sender.get_connection_mut().connect(addr).await
                } else {
                    Err(TransferError::NetworkError {
                        message: "TCP sender not available".to_string(),
                        context: None,
                        recoverable: false,
                    })
                }
            }
            Self::Udp(_wrapper) => {
                // UDP sender doesn't need explicit binding for sending
                // The socket will be bound automatically when sending
                Ok(())
            }
        }
    }
    
    pub async fn bind(&mut self, addr: SocketAddr) -> Result<(), TransferError> {
        match self {
            Self::Tcp(_) => {
                // TCP binding is handled differently (via listener)
                Ok(())
            }
            Self::Udp(wrapper) => {
                if let Some(receiver) = wrapper.receiver_mut() {
                    receiver.get_connection_mut().bind(addr).await
                } else {
                    Err(TransferError::NetworkError {
                        message: "UDP receiver not available".to_string(),
                        context: None,
                        recoverable: false,
                    })
                }
            }
        }
    }
    
    pub async fn send_file(&mut self, file_path: PathBuf, target_addr: SocketAddr) -> Result<TransferResult, TransferError> {
        match self {
            Self::Tcp(wrapper) => {
                if let Some(mut sender) = wrapper.take_sender() {
                    sender.send_file(file_path).await
                } else {
                    Err(TransferError::NetworkError {
                        message: "TCP sender not available".to_string(),
                        context: None,
                        recoverable: false,
                    })
                }
            }
            Self::Udp(wrapper) => {
                if let Some(mut sender) = wrapper.take_sender() {
                    sender.send_file(file_path, target_addr).await
                } else {
                    Err(TransferError::NetworkError {
                        message: "UDP sender not available".to_string(),
                        context: None,
                        recoverable: false,
                    })
                }
            }
        }
    }
    
    pub async fn receive_file(&mut self, output_dir: PathBuf) -> Result<TransferResult, TransferError> {
        match self {
            Self::Tcp(wrapper) => {
                if let Some(mut receiver) = wrapper.take_receiver() {
                    receiver.receive_file(output_dir).await
                } else {
                    Err(TransferError::NetworkError {
                        message: "TCP receiver not available".to_string(),
                        context: None,
                        recoverable: false,
                    })
                }
            }
            Self::Udp(wrapper) => {
                if let Some(mut receiver) = wrapper.take_receiver() {
                    receiver.receive_file(output_dir).await
                } else {
                    Err(TransferError::NetworkError {
                        message: "UDP receiver not available".to_string(),
                        context: None,
                        recoverable: false,
                    })
                }
            }
        }
    }
    
    pub fn set_progress_sender(&mut self, sender: mpsc::UnboundedSender<TransferProgress>) {
        match self {
            Self::Tcp(_) => {
                // TCP doesn't use progress sender in the same way
            }
            Self::Udp(wrapper) => {
                wrapper.set_progress_sender(sender);
            }
        }
    }
    
    pub fn transfer_id(&self) -> String {
        match self {
            Self::Tcp(wrapper) => {
                if let Some(sender) = &wrapper.sender {
                    sender.get_connection().transfer_id().to_string()
                } else if let Some(receiver) = &wrapper.receiver {
                    receiver.get_connection().transfer_id().to_string()
                } else {
                    "unknown".to_string()
                }
            }
            Self::Udp(wrapper) => {
                if let Some(sender) = &wrapper.sender {
                    sender.get_connection().transfer_id().to_string()
                } else if let Some(receiver) = &wrapper.receiver {
                    receiver.get_connection().transfer_id().to_string()
                } else {
                    "unknown".to_string()
                }
            }
        }
    }
    
    // TCP-specific methods
    pub async fn listen(addr: SocketAddr) -> Result<TcpListener, TransferError> {
        TcpConnection::listen(addr).await
    }
    
    pub async fn accept_connection(
        listener: &TcpListener,
        timeout: std::time::Duration,
    ) -> Result<(TcpStream, SocketAddr), TransferError> {
        TcpConnection::accept_connection(listener, timeout).await
    }
    
    pub fn set_tcp_socket(&mut self, socket: TcpStream) {
        if let Self::Tcp(wrapper) = self {
            if let Some(receiver) = wrapper.receiver_mut() {
                receiver.get_connection_mut().set_socket(socket);
            }
        }
    }
}