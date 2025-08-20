# Design Document

## Overview

Este documento describe el diseño de la aplicación simplificada de transferencia de archivos que cumple exactamente con la consigna universitaria. El diseño elimina la complejidad innecesaria del protocolo custom existente y utiliza las capacidades nativas de TCP y UDP, manteniendo una interfaz web simple y funcional.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Svelte/Tauri)                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   File Selector │  │ Protocol Config │  │ Progress UI │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Simple TCP      │  │ Simple UDP      │  │ Progress    │ │
│  │ Transfer        │  │ Transfer        │  │ Tracker     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Checksum        │  │ File Handler    │  │ Config      │ │
│  │ Validator       │  │                 │  │ Manager     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                Native OS Sockets                           │
│           TcpStream/TcpListener | UdpSocket                │
└─────────────────────────────────────────────────────────────┘
```

### Simplified Protocol Design

#### TCP Transfer Protocol (Simplified)
```
Sender:                          Receiver:
1. TcpStream::connect()         1. TcpListener::bind()
2. Send metadata JSON           2. Accept connection
3. Send file data directly      3. Receive metadata
4. Close connection             4. Receive file data
                               5. Validate checksum
                               6. Show result
```

#### UDP Transfer Protocol (Fire-and-forget)
```
Sender:                          Receiver:
1. UdpSocket::bind()            1. UdpSocket::bind()
2. Send metadata packet         2. Receive with timeout
3. Send file in 1KB chunks      3. Reconstruct file
4. Send EOF marker              4. Validate what received
5. No acknowledgments           5. Show result (may be incomplete)
```

## Components and Interfaces

### Core Transfer Components

#### 1. SimpleTcpTransfer
```rust
pub struct SimpleTcpTransfer {
    progress_callback: Option<Box<dyn Fn(TransferProgress) + Send>>,
}

impl SimpleTcpTransfer {
    pub async fn send_file(&self, 
        remote_addr: SocketAddr, 
        file_path: PathBuf
    ) -> Result<TransferResult>;
    
    pub async fn receive_file(&self, 
        listen_addr: SocketAddr
    ) -> Result<TransferResult>;
}
```

#### 2. SimpleUdpTransfer
```rust
pub struct SimpleUdpTransfer {
    chunk_size: usize, // 1KB default
    timeout: Duration,
    progress_callback: Option<Box<dyn Fn(TransferProgress) + Send>>,
}

impl SimpleUdpTransfer {
    pub async fn send_file(&self, 
        remote_addr: SocketAddr, 
        file_path: PathBuf
    ) -> Result<TransferResult>;
    
    pub async fn receive_file(&self, 
        listen_addr: SocketAddr,
        timeout: Duration
    ) -> Result<TransferResult>;
}
```

#### 3. ProgressTracker
```rust
pub struct TransferProgress {
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
    pub eta_seconds: Option<u64>,
    pub percentage: f32,
}

pub struct ProgressTracker {
    start_time: Instant,
    last_update: Instant,
    bytes_transferred: u64,
    total_bytes: u64,
}
```

#### 4. ChecksumValidator
```rust
pub struct ChecksumValidator;

impl ChecksumValidator {
    pub fn calculate_sha256(file_path: &Path) -> Result<String>;
    pub fn validate_integrity(original: &str, received: &str) -> bool;
}
```

### Data Models

#### Transfer Metadata
```rust
#[derive(Serialize, Deserialize)]
pub struct TransferMetadata {
    pub filename: String,
    pub file_size: u64,
    pub checksum: String,
    pub protocol: String, // "TCP" or "UDP"
}
```

#### Transfer Result
```rust
pub struct TransferResult {
    pub success: bool,
    pub bytes_transferred: u64,
    pub duration: Duration,
    pub average_speed: f64,
    pub checksum_match: Option<bool>,
    pub error_message: Option<String>,
}
```

### Frontend Components

#### 1. Main Interface (App.svelte)
```svelte
<script>
  let mode = 'tx'; // 'tx' or 'rx'
  let protocol = 'tcp'; // 'tcp' or 'udp'
  let remoteIp = '';
  let port = 8080;
  let selectedFile = null;
  let transferInProgress = false;
  let transferResult = null;
</script>

<!-- Mode selector, protocol selector, file picker, progress bar -->
```

#### 2. FileSelector Component
```svelte
<script>
  export let selectedFile;
  export let disabled;
  
  function handleFileSelect(event) {
    selectedFile = event.target.files[0];
  }
</script>

<input type="file" on:change={handleFileSelect} {disabled} />
```

#### 3. ProgressBar Component
```svelte
<script>
  export let progress;
  export let visible;
</script>

{#if visible}
  <div class="progress-container">
    <div class="progress-bar" style="width: {progress.percentage}%"></div>
    <div class="progress-stats">
      {progress.bytes_transferred} / {progress.total_bytes} bytes
      Speed: {progress.speed_bps} KB/s
      ETA: {progress.eta_seconds}s
    </div>
  </div>
{/if}
```

## Implementation Details

### TCP Implementation Strategy

#### Sender (Transmitter)
```rust
pub async fn tcp_send_file(remote_addr: SocketAddr, file_path: PathBuf) -> Result<TransferResult> {
    // 1. Calculate checksum
    let checksum = ChecksumValidator::calculate_sha256(&file_path)?;
    let file_size = fs::metadata(&file_path)?.len();
    
    // 2. Connect to receiver
    let mut stream = TcpStream::connect(remote_addr).await?;
    
    // 3. Send metadata
    let metadata = TransferMetadata {
        filename: file_path.file_name().unwrap().to_string_lossy().to_string(),
        file_size,
        checksum: checksum.clone(),
        protocol: "TCP".to_string(),
    };
    let metadata_json = serde_json::to_string(&metadata)?;
    stream.write_all(&(metadata_json.len() as u32).to_be_bytes()).await?;
    stream.write_all(metadata_json.as_bytes()).await?;
    
    // 4. Send file with progress tracking
    let mut file = File::open(&file_path).await?;
    let mut buffer = vec![0u8; 8192];
    let mut bytes_sent = 0u64;
    
    while let Ok(bytes_read) = file.read(&mut buffer).await {
        if bytes_read == 0 { break; }
        
        stream.write_all(&buffer[..bytes_read]).await?;
        bytes_sent += bytes_read as u64;
        
        // Report progress
        if let Some(callback) = &progress_callback {
            callback(TransferProgress {
                bytes_transferred: bytes_sent,
                total_bytes: file_size,
                percentage: (bytes_sent as f32 / file_size as f32) * 100.0,
                // ... calculate speed and ETA
            });
        }
    }
    
    Ok(TransferResult { /* ... */ })
}
```

#### Receiver
```rust
pub async fn tcp_receive_file(listen_addr: SocketAddr) -> Result<TransferResult> {
    let listener = TcpListener::bind(listen_addr).await?;
    let (mut stream, _) = listener.accept().await?;
    
    // 1. Receive metadata
    let mut metadata_len_bytes = [0u8; 4];
    stream.read_exact(&mut metadata_len_bytes).await?;
    let metadata_len = u32::from_be_bytes(metadata_len_bytes) as usize;
    
    let mut metadata_bytes = vec![0u8; metadata_len];
    stream.read_exact(&mut metadata_bytes).await?;
    let metadata: TransferMetadata = serde_json::from_slice(&metadata_bytes)?;
    
    // 2. Receive file
    let output_path = PathBuf::from(&metadata.filename);
    let mut output_file = File::create(&output_path).await?;
    let mut bytes_received = 0u64;
    let mut buffer = vec![0u8; 8192];
    
    while bytes_received < metadata.file_size {
        let bytes_to_read = std::cmp::min(buffer.len(), (metadata.file_size - bytes_received) as usize);
        let bytes_read = stream.read(&mut buffer[..bytes_to_read]).await?;
        if bytes_read == 0 { break; }
        
        output_file.write_all(&buffer[..bytes_read]).await?;
        bytes_received += bytes_read as u64;
        
        // Report progress
    }
    
    // 3. Validate checksum
    let received_checksum = ChecksumValidator::calculate_sha256(&output_path)?;
    let checksum_match = ChecksumValidator::validate_integrity(&metadata.checksum, &received_checksum);
    
    Ok(TransferResult {
        success: checksum_match,
        checksum_match: Some(checksum_match),
        // ...
    })
}
```

### UDP Implementation Strategy

#### Fire-and-forget Approach
```rust
pub async fn udp_send_file(remote_addr: SocketAddr, file_path: PathBuf) -> Result<TransferResult> {
    let socket = UdpSocket::bind("0.0.0.0:0").await?;
    
    // 1. Send metadata
    let metadata = /* ... */;
    let metadata_packet = format!("META:{}", serde_json::to_string(&metadata)?);
    socket.send_to(metadata_packet.as_bytes(), remote_addr).await?;
    
    // 2. Send file in chunks
    let mut file = File::open(&file_path).await?;
    let mut buffer = vec![0u8; 1024]; // 1KB chunks
    let mut chunk_id = 0u32;
    
    while let Ok(bytes_read) = file.read(&mut buffer).await {
        if bytes_read == 0 { break; }
        
        let packet = format!("DATA:{}:{}", chunk_id, 
            base64::encode(&buffer[..bytes_read]));
        socket.send_to(packet.as_bytes(), remote_addr).await?;
        
        chunk_id += 1;
        // No waiting for acknowledgments - true fire-and-forget
    }
    
    // 3. Send EOF marker
    socket.send_to(b"EOF", remote_addr).await?;
    
    Ok(TransferResult { success: true, /* ... */ })
}
```

#### UDP Receiver with Timeout
```rust
pub async fn udp_receive_file(listen_addr: SocketAddr, timeout: Duration) -> Result<TransferResult> {
    let socket = UdpSocket::bind(listen_addr).await?;
    let mut received_chunks = HashMap::new();
    let mut metadata: Option<TransferMetadata> = None;
    let mut eof_received = false;
    
    let timeout_future = tokio::time::sleep(timeout);
    tokio::pin!(timeout_future);
    
    loop {
        tokio::select! {
            result = socket.recv_from(&mut buffer) => {
                let (bytes_received, _) = result?;
                let packet = String::from_utf8_lossy(&buffer[..bytes_received]);
                
                if packet.starts_with("META:") {
                    metadata = Some(serde_json::from_str(&packet[5..])?);
                } else if packet.starts_with("DATA:") {
                    // Parse and store chunk
                } else if packet == "EOF" {
                    eof_received = true;
                    break;
                }
            }
            _ = &mut timeout_future => {
                break; // Timeout reached
            }
        }
    }
    
    // Reconstruct file from received chunks
    // May be incomplete due to UDP nature
    
    Ok(TransferResult { /* ... */ })
}
```

## Error Handling

### Error Types
```rust
#[derive(Debug, thiserror::Error)]
pub enum TransferError {
    #[error("Network error: {0}")]
    Network(#[from] std::io::Error),
    
    #[error("File error: {0}")]
    File(String),
    
    #[error("Checksum validation failed")]
    ChecksumMismatch,
    
    #[error("Invalid configuration: {0}")]
    Configuration(String),
    
    #[error("Timeout occurred")]
    Timeout,
}
```

### Error Handling Strategy

1. **TCP Errors**: Use native TCP error handling, display clear messages
2. **UDP Errors**: Accept packet loss as normal behavior, show warnings
3. **File Errors**: Validate file access before starting transfer
4. **Network Errors**: Show connection status and retry suggestions
5. **Checksum Errors**: Display both checksums for comparison

## Testing Strategy

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_tcp_transfer_success() {
        // Test successful TCP file transfer
    }
    
    #[tokio::test]
    async fn test_udp_fire_and_forget() {
        // Test UDP fire-and-forget behavior
    }
    
    #[test]
    fn test_checksum_calculation() {
        // Test SHA-256 checksum calculation
    }
    
    #[test]
    fn test_progress_tracking() {
        // Test progress calculation accuracy
    }
}
```

### Integration Tests
```rust
#[tokio::test]
async fn test_cross_machine_tcp_transfer() {
    // Test TCP transfer between different addresses
}

#[tokio::test]
async fn test_udp_packet_loss_handling() {
    // Test UDP behavior with simulated packet loss
}
```

### Docker Lab Testing
```dockerfile
# Use existing Docker setup to test between containers
# Simulate network conditions and cross-machine scenarios
```

## Performance Considerations

### TCP Optimizations
- Use 8KB buffer size for optimal throughput
- Leverage TCP's built-in flow control
- No custom acknowledgments needed

### UDP Considerations
- 1KB chunk size to avoid fragmentation
- Accept packet loss as expected behavior
- No retransmission logic (true fire-and-forget)

### Progress Tracking
- Update UI every 100ms maximum
- Calculate speed using moving average
- Estimate ETA based on recent transfer rate

## Security Considerations

### Basic Security Measures
- Validate file paths to prevent directory traversal
- Limit file sizes to prevent resource exhaustion
- Validate IP addresses and port ranges
- Use secure checksum algorithm (SHA-256)

### Network Security
- No authentication implemented (as per consigna)
- Rely on network-level security
- Clear text transmission (as per consigna requirements)

## Migration from Current Implementation

### Modules to Remove
```
backend/src/network/protocol_messages.rs  ❌ Remove
backend/src/network/ack_status.rs         ❌ Remove  
backend/src/network/handshake.rs          ❌ Remove
backend/src/core/sequence_manager.rs      ❌ Remove
backend/src/core/flow_control.rs          ❌ Remove
backend/src/core/custom_retransmit.rs     ❌ Remove
```

### Modules to Simplify
```
backend/src/network/tcp.rs                ✏️  Simplify to native TcpStream
backend/src/network/udp.rs                ✏️  Simplify to native UdpSocket
backend/src/core/transfer.rs              ✏️  Remove protocol wrapper
```

### Modules to Keep
```
backend/src/config/                       ✅ Keep
backend/src/ui/                          ✅ Keep  
frontend/src/                            ✅ Keep (enhance)
tests/                                   ✅ Keep (adapt)
docker/                                  ✅ Keep
```

## Implementation Phases

### Phase 1: Core Simplification
1. Create `simple_tcp_transfer.rs` with native TcpStream
2. Create `simple_udp_transfer.rs` with fire-and-forget
3. Implement `progress_tracker.rs` with callbacks
4. Create `checksum_validator.rs` with SHA-256

### Phase 2: Frontend Enhancement
1. Complete UI with all consigna controls
2. Integrate real-time progress tracking
3. Add activity logs display
4. Handle Tx/Rx mode switching

### Phase 3: Integration
1. Connect simplified backend with frontend
2. Test cross-machine functionality
3. Validate protocol differences are clear
4. Ensure consigna compliance

### Phase 4: Documentation & Testing
1. Document design decisions
2. Create comparison with complex implementation
3. Write usage guide
4. Prepare demonstration scenarios