// UDP transfer wrapper
use crate::network::udp::{UdpFileSender, UdpFileReceiver};
use crate::core::transfer::TransferProgress;
use tokio::sync::mpsc;

pub struct UdpTransferWrapper {
    pub(crate) sender: Option<UdpFileSender>,
    pub(crate) receiver: Option<UdpFileReceiver>,
}

impl UdpTransferWrapper {
    pub fn new(sender: UdpFileSender, receiver: UdpFileReceiver) -> Self {
        Self {
            sender: Some(sender),
            receiver: Some(receiver),
        }
    }
    
    pub fn sender_mut(&mut self) -> Option<&mut UdpFileSender> {
        self.sender.as_mut()
    }
    
    pub fn receiver_mut(&mut self) -> Option<&mut UdpFileReceiver> {
        self.receiver.as_mut()
    }
    
    pub fn take_sender(&mut self) -> Option<UdpFileSender> {
        self.sender.take()
    }
    
    pub fn take_receiver(&mut self) -> Option<UdpFileReceiver> {
        self.receiver.take()
    }
    
    pub fn set_progress_sender(&mut self, sender: mpsc::UnboundedSender<TransferProgress>) {
        if let Some(ref mut udp_sender) = self.sender {
            udp_sender.set_progress_sender(sender.clone());
        }
        if let Some(ref mut udp_receiver) = self.receiver {
            udp_receiver.set_progress_sender(sender);
        }
    }
}