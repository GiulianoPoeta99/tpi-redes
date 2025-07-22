use crate::core::transfer::ack_status::AckStatus;
use serde::{Deserialize, Serialize};

/// Protocol messages for file transfer communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProtocolMessage {
    Handshake { 
        filename: String, 
        size: u64, 
        checksum: String 
    },
    HandshakeAck { 
        accepted: bool, 
        reason: Option<String> 
    },
    DataChunk { 
        sequence: u32, 
        data: Vec<u8> 
    },
    DataAck { 
        sequence: u32, 
        status: AckStatus 
    },
    TransferComplete { 
        checksum: String 
    },
    Error { 
        code: String, 
        message: String 
    },
}