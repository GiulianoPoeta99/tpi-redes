// TCP transfer wrapper
use crate::network::tcp::{TcpFileSender, TcpFileReceiver};

pub struct TcpTransferWrapper {
    pub(crate) sender: Option<TcpFileSender>,
    pub(crate) receiver: Option<TcpFileReceiver>,
}

impl TcpTransferWrapper {
    pub fn new(sender: TcpFileSender, receiver: TcpFileReceiver) -> Self {
        Self {
            sender: Some(sender),
            receiver: Some(receiver),
        }
    }
    
    pub fn sender_mut(&mut self) -> Option<&mut TcpFileSender> {
        self.sender.as_mut()
    }
    
    pub fn receiver_mut(&mut self) -> Option<&mut TcpFileReceiver> {
        self.receiver.as_mut()
    }
    
    pub fn take_sender(&mut self) -> Option<TcpFileSender> {
        self.sender.take()
    }
    
    pub fn take_receiver(&mut self) -> Option<TcpFileReceiver> {
        self.receiver.take()
    }
}