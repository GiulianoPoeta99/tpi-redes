# API Reference

Complete API documentation for the File Transfer Application, covering both the Rust backend library and Tauri command interface.

## 📋 Table of Contents

- [Backend Library API](#backend-library-api)
- [Tauri Commands API](#tauri-commands-api)
- [Event System](#event-system)
- [Data Types](#data-types)
- [Error Handling](#error-handling)
- [Examples](#examples)

## 🦀 Backend Library API

### Core Transfer Functions

#### `start_file_transfer`
Initiates a file transfer operation.

```rust
pub async fn start_file_transfer(
    config: TransferConfig,
    file_path: String,
    target: String
) -> Result<String, TransferError>
```

**Parameters:**
- `config: TransferConfig` - Transfer configuration settings
- `file_path: String` - Path to the file to transfer
- `target: String` - Target address in format "IP:PORT"

**Returns:**
- `Ok(String)` - Transfer ID for tracking
- `Err(TransferError)` - Error if transfer cannot be started

**Example:**
```rust
use file_transfer_backend::{start_file_transfer, TransferConfig, Protocol, TransferMode};

let config = TransferConfig {
    mode: TransferMode::Transmitter,
    protocol: Protocol::Tcp,
    target_ip: Some("192.168.1.100".to_string()),
    port: 8080,
    chunk_size: 8192,
    timeout: Duration::from_secs(30),
    ..Default::default()
};

let transfer_id = start_file_transfer(config, "myfile.txt".to_string(), "192.168.1.100:8080".to_string()).await?;
```

#### `start_file_receiver`
Starts a file receiver to listen for incoming transfers.

```rust
pub async fn start_file_receiver(
    port: u16,
    protocol: Protocol,
    output_dir: String
) -> Result<String, TransferError>
```

**Parameters:**
- `port: u16` - Port number to listen on
- `protocol: Protocol` - Protocol to use (TCP or UDP)
- `output_dir: String` - Directory to save received files

**Returns:**
- `Ok(String)` - Receiver ID for tracking
- `Err(TransferError)` - Error if receiver cannot be started

**Example:**
```rust
let receiver_id = start_file_receiver(8080, Protocol::Tcp, "./downloads".to_string()).await?;
```

#### `get_transfer_progress`
Retrieves current progress for a transfer.

```rust
pub fn get_transfer_progress(transfer_id: &str) -> Option<TransferProgress>
```

**Parameters:**
- `transfer_id: &str` - Transfer ID returned from start functions

**Returns:**
- `Some(TransferProgress)` - Current progress information
- `None` - Transfer not found or completed

**Example:**
```rust
if let Some(progress) = get_transfer_progress(&transfer_id) {
    println!("Progress: {:.1}%", progress.progress * 100.0);
    println!("Speed: {:.2} MB/s", progress.speed / 1_000_000.0);
}
```

#### `cancel_transfer`
Cancels an active transfer.

```rust
pub async fn cancel_transfer(transfer_id: &str) -> Result<(), TransferError>
```

**Parameters:**
- `transfer_id: &str` - Transfer ID to cancel

**Returns:**
- `Ok(())` - Transfer cancelled successfully
- `Err(TransferError)` - Error cancelling transfer

**Example:**
```rust
cancel_transfer(&transfer_id).await?;
```

#### `list_active_transfers`
Lists all currently active transfers.

```rust
pub fn list_active_transfers() -> Vec<TransferInfo>
```

**Returns:**
- `Vec<TransferInfo>` - List of active transfer information

**Example:**
```rust
let active_transfers = list_active_transfers();
for transfer in active_transfers {
    println!("Transfer {}: {} -> {}", transfer.id, transfer.source, transfer.target);
}
```

### Configuration Functions

#### `validate_config`
Validates a transfer configuration.

```rust
pub fn validate_config(config: &TransferConfig) -> Result<(), ValidationError>
```

**Parameters:**
- `config: &TransferConfig` - Configuration to validate

**Returns:**
- `Ok(())` - Configuration is valid
- `Err(ValidationError)` - Configuration validation failed

#### `get_default_config`
Returns default configuration for a protocol.

```rust
pub fn get_default_config(protocol: Protocol) -> TransferConfig
```

**Parameters:**
- `protocol: Protocol` - Protocol to get defaults for

**Returns:**
- `TransferConfig` - Default configuration

### File Operations

#### `calculate_file_checksum`
Calculates SHA-256 checksum for a file.

```rust
pub fn calculate_file_checksum<P: AsRef<Path>>(path: P) -> Result<String, std::io::Error>
```

**Parameters:**
- `path: P` - Path to file

**Returns:**
- `Ok(String)` - SHA-256 checksum as hex string
- `Err(std::io::Error)` - File I/O error

#### `validate_file_path`
Validates a file path for transfer.

```rust
pub fn validate_file_path<P: AsRef<Path>>(path: P) -> Result<FileMetadata, FileError>
```

**Parameters:**
- `path: P` - Path to validate

**Returns:**
- `Ok(FileMetadata)` - File metadata if valid
- `Err(FileError)` - File validation error

### Network Utilities

#### `test_connectivity`
Tests network connectivity to a target.

```rust
pub async fn test_connectivity(target: &str, timeout: Duration) -> Result<(), NetworkError>
```

**Parameters:**
- `target: &str` - Target address "IP:PORT"
- `timeout: Duration` - Connection timeout

**Returns:**
- `Ok(())` - Connection successful
- `Err(NetworkError)` - Connection failed

#### `get_local_ip`
Gets the local IP address for network interface.

```rust
pub fn get_local_ip() -> Result<String, NetworkError>
```

**Returns:**
- `Ok(String)` - Local IP address
- `Err(NetworkError)` - Cannot determine IP

## 🌉 Tauri Commands API

### Transfer Commands

#### `transfer_file`
Tauri command to start file transfer.

```typescript
invoke('transfer_file', {
  config: TransferConfig,
  filePath: string,
  target: string
}): Promise<string>
```

**Parameters:**
```typescript
interface TransferFileParams {
  config: TransferConfig;
  filePath: string;
  target: string;
}
```

**Returns:**
- `Promise<string>` - Transfer ID

**Example:**
```typescript
import { invoke } from '@tauri-apps/api/core';

const transferId = await invoke('transfer_file', {
  config: {
    mode: 'transmitter',
    protocol: 'tcp',
    port: 8080,
    chunkSize: 8192,
    timeout: 30
  },
  filePath: '/path/to/file.txt',
  target: '192.168.1.100:8080'
});
```

#### `receive_file`
Tauri command to start file receiver.

```typescript
invoke('receive_file', {
  port: number,
  protocol: string,
  outputDir: string
}): Promise<string>
```

**Parameters:**
```typescript
interface ReceiveFileParams {
  port: number;
  protocol: 'tcp' | 'udp';
  outputDir: string;
}
```

**Returns:**
- `Promise<string>` - Receiver ID

**Example:**
```typescript
const receiverId = await invoke('receive_file', {
  port: 8080,
  protocol: 'tcp',
  outputDir: '/path/to/downloads'
});
```

#### `get_progress`
Gets transfer progress.

```typescript
invoke('get_progress', { transferId: string }): Promise<TransferProgress | null>
```

**Parameters:**
- `transferId: string` - Transfer ID

**Returns:**
- `Promise<TransferProgress | null>` - Progress or null if not found

#### `cancel_transfer`
Cancels a transfer.

```typescript
invoke('cancel_transfer', { transferId: string }): Promise<void>
```

**Parameters:**
- `transferId: string` - Transfer ID to cancel

**Returns:**
- `Promise<void>` - Resolves when cancelled

#### `list_transfers`
Lists active transfers.

```typescript
invoke('list_transfers'): Promise<TransferInfo[]>
```

**Returns:**
- `Promise<TransferInfo[]>` - Array of active transfers

### Configuration Commands

#### `get_config`
Gets current application configuration.

```typescript
invoke('get_config'): Promise<AppConfig>
```

**Returns:**
- `Promise<AppConfig>` - Current configuration

#### `set_config`
Updates application configuration.

```typescript
invoke('set_config', { config: AppConfig }): Promise<void>
```

**Parameters:**
- `config: AppConfig` - New configuration

#### `validate_config`
Validates configuration.

```typescript
invoke('validate_config', { config: TransferConfig }): Promise<ValidationResult>
```

**Parameters:**
- `config: TransferConfig` - Configuration to validate

**Returns:**
- `Promise<ValidationResult>` - Validation result

### File System Commands

#### `select_file`
Opens file selection dialog.

```typescript
invoke('select_file', { 
  filters?: FileFilter[],
  multiple?: boolean 
}): Promise<string | string[] | null>
```

**Parameters:**
```typescript
interface FileFilter {
  name: string;
  extensions: string[];
}
```

**Returns:**
- `Promise<string | string[] | null>` - Selected file path(s) or null

#### `select_directory`
Opens directory selection dialog.

```typescript
invoke('select_directory'): Promise<string | null>
```

**Returns:**
- `Promise<string | null>` - Selected directory path or null

#### `get_file_info`
Gets file information.

```typescript
invoke('get_file_info', { path: string }): Promise<FileInfo>
```

**Parameters:**
- `path: string` - File path

**Returns:**
- `Promise<FileInfo>` - File information

### Network Commands

#### `test_connection`
Tests network connectivity.

```typescript
invoke('test_connection', { 
  target: string,
  timeout?: number 
}): Promise<boolean>
```

**Parameters:**
- `target: string` - Target address "IP:PORT"
- `timeout?: number` - Timeout in seconds (default: 5)

**Returns:**
- `Promise<boolean>` - Connection success

#### `get_network_info`
Gets network interface information.

```typescript
invoke('get_network_info'): Promise<NetworkInfo>
```

**Returns:**
- `Promise<NetworkInfo>` - Network information

## 📡 Event System

### Event Types

#### Transfer Progress Events
```typescript
listen<TransferProgressEvent>('transfer-progress', (event) => {
  const { transferId, progress, speed, eta } = event.payload;
  // Update UI with progress
});
```

**Event Payload:**
```typescript
interface TransferProgressEvent {
  transferId: string;
  progress: number;      // 0.0 - 1.0
  speed: number;         // bytes per second
  eta: number;           // seconds remaining
  bytesTransferred: number;
  totalBytes: number;
}
```

#### Transfer Completion Events
```typescript
listen<TransferCompletedEvent>('transfer-completed', (event) => {
  const { transferId, result } = event.payload;
  // Handle completion
});
```

**Event Payload:**
```typescript
interface TransferCompletedEvent {
  transferId: string;
  result: TransferResult;
  duration: number;
  checksum?: string;
}
```

#### Transfer Error Events
```typescript
listen<TransferErrorEvent>('transfer-error', (event) => {
  const { transferId, error } = event.payload;
  // Handle error
});
```

**Event Payload:**
```typescript
interface TransferErrorEvent {
  transferId: string;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}
```

#### Connection Events
```typescript
listen<ConnectionEvent>('connection-status', (event) => {
  const { status, target } = event.payload;
  // Handle connection status
});
```

**Event Payload:**
```typescript
interface ConnectionEvent {
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  target?: string;
  protocol?: 'tcp' | 'udp';
}
```

### Event Listeners Setup

```typescript
import { listen } from '@tauri-apps/api/event';

// Setup all event listeners
export function setupEventListeners() {
  // Progress updates
  listen<TransferProgressEvent>('transfer-progress', handleProgress);
  
  // Transfer completion
  listen<TransferCompletedEvent>('transfer-completed', handleCompletion);
  
  // Error handling
  listen<TransferErrorEvent>('transfer-error', handleError);
  
  // Connection status
  listen<ConnectionEvent>('connection-status', handleConnection);
}

function handleProgress(event: Event<TransferProgressEvent>) {
  const { transferId, progress, speed } = event.payload;
  transferStore.update(state => ({
    ...state,
    currentTransfer: {
      ...state.currentTransfer!,
      progress,
      speed
    }
  }));
}
```

## 📊 Data Types

### Core Types

#### `TransferConfig`
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferConfig {
    pub mode: TransferMode,
    pub protocol: Protocol,
    pub target_ip: Option<String>,
    pub port: u16,
    pub chunk_size: usize,
    pub timeout: Duration,
    pub max_retries: u32,
    pub file_path: Option<PathBuf>,
    pub output_directory: Option<PathBuf>,
}
```

**TypeScript Interface:**
```typescript
interface TransferConfig {
  mode: 'transmitter' | 'receiver';
  protocol: 'tcp' | 'udp';
  targetIp?: string;
  port: number;
  chunkSize: number;
  timeout: number;
  maxRetries: number;
  filePath?: string;
  outputDirectory?: string;
}
```

#### `TransferProgress`
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub progress: f64,        // 0.0 - 1.0
    pub speed: f64,           // bytes per second
    pub eta: u64,             // seconds remaining
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub status: TransferStatus,
}
```

**TypeScript Interface:**
```typescript
interface TransferProgress {
  transferId: string;
  progress: number;         // 0.0 - 1.0
  speed: number;            // bytes per second
  eta: number;              // seconds remaining
  bytesTransferred: number;
  totalBytes: number;
  status: TransferStatus;
}
```

#### `TransferResult`
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct TransferResult {
    pub success: bool,
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: Duration,
    pub checksum: Option<String>,
    pub error: Option<String>,
}
```

#### `FileMetadata`
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub filename: String,
    pub size: u64,
    pub checksum: String,
    pub modified: SystemTime,
    pub file_type: String,
}
```

### Enums

#### `Protocol`
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Protocol {
    Tcp,
    Udp,
}
```

#### `TransferMode`
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferMode {
    Transmitter,
    Receiver,
}
```

#### `TransferStatus`
```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum TransferStatus {
    Idle,
    Connecting,
    Transferring,
    Completed,
    Failed,
    Cancelled,
}
```

### Error Types

#### `TransferError`
```rust
#[derive(thiserror::Error, Debug, Serialize, Deserialize)]
pub enum TransferError {
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("File error: {message}")]
    FileError { message: String },
    
    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },
    
    #[error("Timeout after {seconds}s")]
    Timeout { seconds: u64 },
    
    #[error("Protocol error: {message}")]
    ProtocolError { message: String },
    
    #[error("Configuration error: {message}")]
    ConfigError { message: String },
    
    #[error("Transfer cancelled")]
    Cancelled,
}
```

**TypeScript Class:**
```typescript
class TransferError extends Error {
  constructor(
    message: string,
    public code: string,
    public transferId?: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'TransferError';
  }
}
```

## 🚨 Error Handling

### Error Categories

#### Network Errors
- **Connection Refused**: Target not reachable
- **Timeout**: Operation timed out
- **Connection Lost**: Network disconnection during transfer

#### File Errors
- **File Not Found**: Source file doesn't exist
- **Permission Denied**: Insufficient file permissions
- **Disk Full**: Not enough space for received file

#### Protocol Errors
- **Invalid Message**: Malformed protocol message
- **Checksum Mismatch**: File integrity verification failed
- **Protocol Violation**: Unexpected protocol state

#### Configuration Errors
- **Invalid IP Address**: Malformed IP address
- **Invalid Port**: Port out of valid range
- **Invalid Path**: File path validation failed

### Error Recovery

#### Automatic Recovery
```rust
// Exponential backoff retry logic
pub struct RetryConfig {
    pub max_attempts: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
    pub backoff_factor: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_factor: 2.0,
        }
    }
}
```

#### Manual Recovery
```typescript
// Frontend error recovery
async function handleTransferError(error: TransferError) {
  if (error.recoverable) {
    // Show retry option to user
    const shouldRetry = await showRetryDialog(error.message);
    if (shouldRetry) {
      return retryTransfer(error.transferId);
    }
  }
  
  // Show error notification
  showErrorNotification(error.message);
}
```

## 📝 Examples

### Complete Transfer Example

#### Backend (Rust)
```rust
use file_transfer_backend::*;
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configure transfer
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("192.168.1.100".to_string()),
        port: 8080,
        chunk_size: 8192,
        timeout: Duration::from_secs(30),
        ..Default::default()
    };
    
    // Start transfer
    let transfer_id = start_file_transfer(
        config,
        "document.pdf".to_string(),
        "192.168.1.100:8080".to_string()
    ).await?;
    
    // Monitor progress
    loop {
        if let Some(progress) = get_transfer_progress(&transfer_id) {
            println!("Progress: {:.1}%", progress.progress * 100.0);
            
            if matches!(progress.status, TransferStatus::Completed | TransferStatus::Failed) {
                break;
            }
        }
        
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    
    Ok(())
}
```

#### Frontend (TypeScript/Svelte)
```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Setup event listeners
listen<TransferProgressEvent>('transfer-progress', (event) => {
  const { progress, speed } = event.payload;
  updateProgressUI(progress, speed);
});

listen<TransferCompletedEvent>('transfer-completed', (event) => {
  showCompletionNotification(event.payload.result);
});

// Start transfer
async function startTransfer(filePath: string, target: string) {
  try {
    const config: TransferConfig = {
      mode: 'transmitter',
      protocol: 'tcp',
      port: 8080,
      chunkSize: 8192,
      timeout: 30,
      maxRetries: 3
    };
    
    const transferId = await invoke('transfer_file', {
      config,
      filePath,
      target
    });
    
    console.log('Transfer started:', transferId);
    
  } catch (error) {
    console.error('Transfer failed:', error);
    showErrorNotification(error.message);
  }
}
```

### CLI Integration Example

```rust
use clap::{Arg, Command};
use file_transfer_backend::*;

fn main() {
    let matches = Command::new("file-transfer-cli")
        .subcommand(
            Command::new("send")
                .arg(Arg::new("target").required(true))
                .arg(Arg::new("file").required(true))
                .arg(Arg::new("protocol").long("protocol").default_value("tcp"))
        )
        .get_matches();
    
    if let Some(matches) = matches.subcommand_matches("send") {
        let target = matches.get_one::<String>("target").unwrap();
        let file = matches.get_one::<String>("file").unwrap();
        let protocol = matches.get_one::<String>("protocol").unwrap();
        
        let config = TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: match protocol.as_str() {
                "udp" => Protocol::Udp,
                _ => Protocol::Tcp,
            },
            ..Default::default()
        };
        
        // Start transfer using the library
        tokio::runtime::Runtime::new().unwrap().block_on(async {
            match start_file_transfer(config, file.clone(), target.clone()).await {
                Ok(transfer_id) => println!("Transfer started: {}", transfer_id),
                Err(e) => eprintln!("Transfer failed: {}", e),
            }
        });
    }
}
```

## 🔧 Configuration Reference

### Default Configuration Values

```rust
impl Default for TransferConfig {
    fn default() -> Self {
        Self {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: None,
            port: 8080,
            chunk_size: 8192,  // TCP default
            timeout: Duration::from_secs(30),
            max_retries: 3,
            file_path: None,
            output_directory: Some(PathBuf::from("./downloads")),
        }
    }
}
```

### Protocol-Specific Defaults

| Setting | TCP | UDP |
|---------|-----|-----|
| Chunk Size | 8192 bytes | 1024 bytes |
| Timeout | 30 seconds | 30 seconds |
| Max Retries | 3 | 0 |
| Acknowledgments | Yes | No |
| Checksums | Yes | No |

### Environment Variables

```bash
# Configuration via environment variables
export FT_DEFAULT_CHUNK_SIZE=8192
export FT_DEFAULT_TIMEOUT=30
export FT_LOG_LEVEL=info
export FT_MAX_RETRIES=3
```

---

*This API reference covers version 1.0.0 of the File Transfer Application. For usage examples, see the [User Manual](user-manual.md).*