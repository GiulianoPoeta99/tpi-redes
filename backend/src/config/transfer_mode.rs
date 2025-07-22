// Transfer mode enumeration
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferMode {
    Transmitter,
    Receiver,
}

impl std::str::FromStr for TransferMode {
    type Err = String;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "transmitter" | "sender" | "send" => Ok(TransferMode::Transmitter),
            "receiver" | "receive" | "recv" => Ok(TransferMode::Receiver),
            _ => Err(format!("Invalid transfer mode: {}", s)),
        }
    }
}

impl std::fmt::Display for TransferMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransferMode::Transmitter => write!(f, "transmitter"),
            TransferMode::Receiver => write!(f, "receiver"),
        }
    }
}