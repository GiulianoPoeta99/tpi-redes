# Design Document

## Overview

The file transfer application is designed as a hybrid system combining a Rust backend library with a modern desktop frontend. The architecture follows a modular approach where the Rust backend handles all network operations, file processing, and protocol implementation, while the Svelte + Tauri frontend provides an intuitive user interface and desktop integration.

The system supports both TCP and UDP protocols with custom reliability layers, implements SHA-256 integrity verification, and provides real-time progress monitoring through an event-driven architecture.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Tauri         │    │   Backend       │
│   (Svelte)      │◄──►│   (src-tauri/)  │◄──►│   (Library)     │
│                 │    │                 │    │                 │
│ • UI Components │    │ • Commands      │    │ • Socket Logic  │
│ • State Mgmt    │    │ • Event Emitter │    │ • File Transfer │
│ • User Input    │    │ • IPC Bridge    │    │ • Checksums     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Network       │
                    │   (TCP/UDP)     │
                    │                 │
                    │ • Socket Comms  │
                    │ • File Transfer │
                    │ • Integrity     │
                    └─────────────────┘
```

### Project Structure

```
tpi-redes/
├── backend/           # Rust library + CLI
│   ├── src/
│   │   ├── main.rs    # CLI entry point
│   │   ├── lib.rs     # Library exports for Tauri
│   │   ├── config/    # Configuration management
│   │   │   ├── mod.rs           # Module exports
│   │   │   ├── transfer_config.rs    # TransferConfig struct
│   │   │   ├── protocol.rs      # Protocol enum
│   │   │   └── transfer_mode.rs # TransferMode enum
│   │   ├── sockets/   # TCP/UDP implementations
│   │   │   ├── mod.rs           # Module exports
│   │   │   ├── tcp_transfer.rs  # TcpTransfer struct
│   │   │   └── udp_transfer.rs  # UdpTransfer struct
│   │   ├── transfer/  # File transfer logic
│   │   │   ├── mod.rs           # Module exports
│   │   │   ├── tcp_chunker.rs   # TcpFileChunker struct
│   │   │   ├── udp_chunker.rs   # UdpFileChunker struct
│   │   │   ├── tcp_messages.rs  # TcpProtocolMessage enum
│   │   │   └── udp_messages.rs  # UdpProtocolMessage enum
│   │   ├── crypto/    # Checksums and encryption
│   │   │   ├── mod.rs           # Module exports
│   │   │   └── checksum_calculator.rs # ChecksumCalculator struct
│   │   └── utils/     # Logging, errors, events
│   │       ├── mod.rs           # Module exports
│   │       ├── transfer_error.rs # TransferError enum
│   │       ├── transfer_progress.rs # TransferProgress struct
│   │       └── transfer_result.rs # TransferResult struct
│   └── Cargo.toml     # Configured as lib + bin
├── frontend/          # Svelte + Tauri
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── ModeSelector.svelte      # Mode selection component
│   │   │   │   ├── FileDropZone.svelte     # File drop component
│   │   │   │   ├── ConnectionConfig.svelte # Connection config component
│   │   │   │   └── TransferProgress.svelte # Progress display component
│   │   │   ├── stores/
│   │   │   │   ├── transfer.ts             # Transfer state store
│   │   │   │   └── config.ts               # Configuration store
│   │   │   ├── types/
│   │   │   │   ├── transfer-config.ts      # TransferConfig interface
│   │   │   │   ├── transfer-progress.ts    # TransferProgress interface
│   │   │   │   └── transfer-record.ts      # TransferRecord interface
│   │   │   └── utils/
│   │   │       ├── tauri-commands.ts       # Tauri command interface
│   │   │       ├── tauri-events.ts         # Event listeners
│   │   │       └── transfer-error.ts       # TransferError class
│   │   └── routes/
│   └── src-tauri/     # Tauri wrapper (depends on backend)
├── persistence/       # Configuration and history
└── docs/             # Technical documentation
```

### Code Organization Principles

#### Single Definition Per File
- **Backend (Rust)**: Each `.rs` file contains exactly one main struct, enum, or trait definition
- **Frontend (TypeScript/Svelte)**: Each file contains exactly one main component, class, or interface definition
- **Helper Functions**: Related helper functions and implementations are co-located with their main definition
- **Module Structure**: Each module has a clear single responsibility and purpose

#### File Naming Conventions
- **Rust Files**: Use snake_case matching the main definition name (e.g., `transfer_config.rs` for `TransferConfig`)
- **TypeScript Files**: Use kebab-case for interfaces and classes (e.g., `transfer-config.ts`)
- **Svelte Components**: Use PascalCase matching the component name (e.g., `ModeSelector.svelte`)
- **Module Files**: Use `mod.rs` for module exports and re-exports

## Protocol Flow Design

### TCP Transfer Flow (Theoretical Implementation)

```
Sender (PC A)                    Receiver (PC B)
     |                                |
     |  1. TCP SYN                   |
     |------------------------------>|
     |  2. TCP SYN-ACK               |
     |<------------------------------|
     |  3. TCP ACK                   |
     |------------------------------>|
     |  [CONNECTION ESTABLISHED]     |
     |                               |
     |  4. FileMetadata              |
     |------------------------------>|
     |  5. MetadataAck               |
     |<------------------------------|
     |                               |
     |  6. DataChunk (8KB, seq=1)    |
     |------------------------------>|
     |  7. ChunkAck (seq=1)          |
     |<------------------------------|
     |  8. DataChunk (8KB, seq=2)    |
     |------------------------------>|
     |  9. ChunkAck (seq=2)          |
     |<------------------------------|
     |  ... (repeat for all chunks)  |
     |                               |
     |  N. FinalChecksum             |
     |------------------------------>|
     |  N+1. ChecksumAck             |
     |<------------------------------|
     |  N+2. TCP FIN                 |
     |------------------------------>|
     |  N+3. TCP FIN-ACK             |
     |<------------------------------|
```

### UDP Transfer Flow (Theoretical Implementation)

```
Sender (PC A)                    Receiver (PC B)
     |                                |
     |  [NO CONNECTION SETUP]        |
     |                               |
     |  1. DataChunk (1KB)           |
     |------------------------------>|
     |  2. DataChunk (1KB)           |
     |------------------------------>|
     |  3. DataChunk (1KB)           |
     |------------------------------>|
     |  ... (continuous sending)     |
     |                               |
     |  N. DataChunk (1KB, last)     |
     |------------------------------>|
     |  N+1. FinMarker               |
     |------------------------------>|
     |  N+2. FinMarker               |
     |------------------------------>|
     |  N+3. FinMarker               |
     |------------------------------>|
     |  [SENDER COMPLETES]           |
     |                               |
     |                          [RECEIVER]
     |                      [30s TIMEOUT]
     |                      [ASSUMES END]
```

## Components and Interfaces

### Protocol Implementation Philosophy

#### TCP: Reliable, Connection-Oriented
- **Connection Management**: Full TCP handshake establishment and teardown
- **Data Integrity**: Built-in TCP reliability with acknowledgments for every chunk
- **Flow Control**: TCP's built-in flow control plus application-level chunk acknowledgments
- **Error Handling**: Connection-based error detection and recovery
- **Chunk Size**: 8KB chunks to leverage TCP's reliability for larger data blocks
- **Metadata Exchange**: Formal handshake with file information before transfer

#### UDP: Unreliable, Fire-and-Forget
- **No Connection**: Direct packet sending without connection establishment
- **No Acknowledgments**: Pure fire-and-forget behavior, no reliability layer
- **No Flow Control**: Continuous sending without waiting for confirmations
- **Error Handling**: No error detection - packets may be lost silently
- **Chunk Size**: 1KB chunks to minimize impact of packet loss
- **Completion Detection**: Timeout-based detection using FIN markers

### Backend Components

#### 1. Socket Layer (`sockets/`)

**TCP Implementation (Connection-Oriented with Handshakes):**
```rust
pub struct TcpTransfer {
    socket: TcpStream,
    config: TransferConfig,
}

impl TcpTransfer {
    pub async fn connect(addr: SocketAddr) -> Result<Self>;
    pub async fn listen(addr: SocketAddr) -> Result<TcpListener>;
    pub async fn send_file_with_handshake(&mut self, file_path: PathBuf) -> Result<TransferResult>;
    pub async fn receive_file_with_handshake(&mut self, output_path: PathBuf) -> Result<TransferResult>;
    
    // TCP-specific methods for proper protocol flow
    async fn send_metadata(&mut self, metadata: FileMetadata) -> Result<()>;
    async fn wait_for_metadata_ack(&mut self) -> Result<()>;
    async fn send_chunk_with_ack(&mut self, chunk: &[u8], sequence: u32) -> Result<()>;
    async fn send_final_checksum(&mut self, checksum: &str) -> Result<()>;
}
```

**UDP Implementation (Connectionless, Fire-and-Forget):**
```rust
pub struct UdpTransfer {
    socket: UdpSocket,
    config: TransferConfig,
}

impl UdpTransfer {
    pub async fn bind(addr: SocketAddr) -> Result<Self>;
    pub async fn send_file_unreliable(&mut self, file_path: PathBuf, target: SocketAddr) -> Result<TransferResult>;
    pub async fn receive_file_with_timeout(&mut self, output_path: PathBuf, timeout: Duration) -> Result<TransferResult>;
    
    // UDP-specific methods for fire-and-forget behavior
    async fn send_chunk_no_ack(&mut self, chunk: &[u8], target: SocketAddr) -> Result<()>;
    async fn send_fin_markers(&mut self, target: SocketAddr) -> Result<()>;
    async fn receive_with_timeout(&mut self, timeout: Duration) -> Result<Option<Vec<u8>>>;
}
```

#### 2. Transfer Layer (`transfer/`)

**File Chunking (Protocol-Specific):**
```rust
pub struct TcpFileChunker {
    chunk_size: usize, // 8KB for TCP
    total_chunks: usize,
    current_sequence: u32,
}

pub struct UdpFileChunker {
    chunk_size: usize, // 1KB for UDP
    total_chunks: usize,
}

impl TcpFileChunker {
    pub fn new(file_size: u64) -> Self; // Fixed 8KB chunks
    pub async fn read_chunk_with_sequence(&mut self) -> Result<(u32, Vec<u8>)>;
    pub async fn write_chunk_with_sequence(&mut self, sequence: u32, data: Vec<u8>) -> Result<()>;
}

impl UdpFileChunker {
    pub fn new(file_size: u64) -> Self; // Fixed 1KB chunks
    pub async fn read_chunk(&mut self) -> Result<Vec<u8>>;
    pub async fn write_chunk(&mut self, data: Vec<u8>) -> Result<()>;
}
```

**TCP Protocol Messages (With Acknowledgments):**
```rust
#[derive(Serialize, Deserialize)]
pub enum TcpProtocolMessage {
    FileMetadata { filename: String, size: u64, checksum: String },
    MetadataAck { accepted: bool, reason: Option<String> },
    DataChunk { sequence: u32, data: Vec<u8> }, // 8KB chunks
    ChunkAck { sequence: u32, status: AckStatus },
    FinalChecksum { checksum: String },
    ChecksumAck { verified: bool },
    Error { code: String, message: String },
}
```

**UDP Protocol Messages (No Acknowledgments):**
```rust
#[derive(Serialize, Deserialize)]
pub enum UdpProtocolMessage {
    DataChunk { data: Vec<u8> }, // 1KB chunks, no sequence numbers needed
    FinMarker, // Empty marker to signal end of transfer
}

// UDP uses minimal message structure since there are no acknowledgments
// Receiver detects completion via timeout after receiving FIN markers
```

#### 3. Crypto Layer (`crypto/`)

**Checksum Calculation:**
```rust
pub struct ChecksumCalculator;

impl ChecksumCalculator {
    pub fn calculate_file_sha256(path: &Path) -> Result<String>;
    pub fn calculate_stream_sha256(reader: impl Read) -> Result<String>;
    pub fn verify_integrity(expected: &str, actual: &str) -> bool;
}
```

#### 4. Configuration Layer (`config/`)

**Core Configuration Types:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferConfig {
    pub mode: TransferMode,
    pub protocol: Protocol,
    pub target_ip: Option<String>,
    pub port: u16,
    pub filename: Option<String>,
    pub chunk_size: usize,
    pub timeout: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Protocol {
    Tcp,
    Udp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferMode {
    Transmitter,
    Receiver,
}
```

### Frontend Components

#### 1. Core UI Components

**Mode Selector:**
```svelte
<!-- ModeSelector.svelte -->
<script lang="ts">
  export let selectedMode: 'transmitter' | 'receiver';
  export let onModeChange: (mode: 'transmitter' | 'receiver') => void;
</script>

<div class="mode-selector">
  <button 
    class:active={selectedMode === 'transmitter'}
    on:click={() => onModeChange('transmitter')}
  >
    📡 Transmitter
  </button>
  <button 
    class:active={selectedMode === 'receiver'}
    on:click={() => onModeChange('receiver')}
  >
    📥 Receiver
  </button>
</div>
```

**File Drop Zone:**
```svelte
<!-- FileDropZone.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    filesSelected: File[]
  }>();
  
  let dragOver = false;
  
  function handleDrop(event: DragEvent) {
    dragOver = false;
    const files = Array.from(event.dataTransfer?.files || []);
    dispatch('filesSelected', files);
  }
</script>

<div 
  class="dropzone"
  class:drag-over={dragOver}
  on:dragover|preventDefault={() => dragOver = true}
  on:dragleave={() => dragOver = false}
  on:drop|preventDefault={handleDrop}
>
  <div class="dropzone-content">
    📁 Drag & drop files here or click to browse
  </div>
</div>
```

#### 2. State Management

**Transfer Store:**
```typescript
// stores/transfer.ts
interface TransferState {
  currentTransfer: TransferProgress | null;
  history: TransferRecord[];
  config: TransferConfig;
}

export const transferStore = writable<TransferState>({
  currentTransfer: null,
  history: [],
  config: defaultConfig
});

export const transferActions = {
  async startTransfer(config: TransferConfig, filePath: string): Promise<void> {
    const transferId = await invoke('transfer_file', { config, filePath });
    // Update store state
  },
  
  async cancelTransfer(): Promise<void> {
    if (get(transferStore).currentTransfer) {
      await invoke('cancel_transfer', { 
        transferId: get(transferStore).currentTransfer!.transferId 
      });
    }
  }
};
```

#### 3. Tauri Integration Layer

**Command Interface:**
```typescript
// lib/tauri-commands.ts
export interface TauriCommands {
  transfer_file(config: TransferConfig, filePath: string, target: string): Promise<string>;
  receive_file(port: number, protocol: string, outputDir: string): Promise<string>;
  get_progress(transferId: string): Promise<TransferProgress>;
  cancel_transfer(transferId: string): Promise<void>;
}

export const tauriCommands: TauriCommands = {
  async transfer_file(config, filePath, target) {
    return await invoke('transfer_file', { config, filePath, target });
  },
  
  async receive_file(port, protocol, outputDir) {
    return await invoke('receive_file', { port, protocol, outputDir });
  },
  
  async get_progress(transferId) {
    return await invoke('get_progress', { transferId });
  },
  
  async cancel_transfer(transferId) {
    return await invoke('cancel_transfer', { transferId });
  }
};
```

**Event Listeners:**
```typescript
// lib/tauri-events.ts
export function setupEventListeners() {
  listen<TransferProgressEvent>('transfer-progress', (event) => {
    transferStore.update(state => ({
      ...state,
      currentTransfer: {
        ...state.currentTransfer!,
        progress: event.payload.progress,
        speed: event.payload.speed,
        eta: event.payload.eta
      }
    }));
  });
  
  listen<TransferErrorEvent>('transfer-error', (event) => {
    transferStore.update(state => ({
      ...state,
      currentTransfer: {
        ...state.currentTransfer!,
        status: 'error',
        error: event.payload.error
      }
    }));
  });
  
  listen<TransferCompletedEvent>('transfer-completed', (event) => {
    transferStore.update(state => ({
      ...state,
      currentTransfer: null,
      history: [
        ...state.history,
        {
          id: event.payload.transferId,
          status: 'completed',
          bytesTransferred: event.payload.bytesTransferred,
          duration: event.payload.duration,
          checksum: event.payload.checksum,
          timestamp: new Date()
        }
      ]
    }));
  });
}
```

## Data Models

### Core Data Types

#### Backend (Rust)

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub progress: f64,        // 0.0 - 1.0
    pub speed: f64,           // bytes per second
    pub eta: u64,             // seconds remaining
    pub status: TransferStatus,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum TransferStatus {
    Idle,
    Connecting,
    Transferring,
    Completed,
    Error,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferResult {
    pub success: bool,
    pub transfer_id: String,
    pub bytes_transferred: u64,
    pub duration: Duration,
    pub checksum: String,
    pub error: Option<String>,
}
```

#### Frontend (TypeScript)

```typescript
export interface TransferProgress {
  transferId: string;
  progress: number;        // 0.0 - 1.0
  speed: number;           // bytes per second
  eta: number;             // seconds remaining
  status: 'idle' | 'connecting' | 'transferring' | 'completed' | 'error';
  error?: string;
}

export interface TransferConfig {
  mode: 'transmitter' | 'receiver';
  protocol: 'tcp' | 'udp';
  targetIp?: string;
  port: number;
  filename?: string;
  chunkSize: number;
  timeout: number;
}

export interface TransferRecord {
  id: string;
  filename: string;
  size: number;
  mode: 'sent' | 'received';
  protocol: 'tcp' | 'udp';
  target: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  duration: number;
  checksum: string;
  error?: string;
}
```

### Protocol Message Format

```rust
#[derive(Serialize, Deserialize)]
pub struct MessageHeader {
    pub message_type: MessageType,
    pub sequence: u32,
    pub payload_size: u32,
    pub checksum: u32,
}

#[derive(Serialize, Deserialize)]
pub enum MessageType {
    Handshake = 0x01,
    HandshakeAck = 0x02,
    DataChunk = 0x03,
    DataAck = 0x04,
    TransferComplete = 0x05,
    Error = 0xFF,
}
```

## Error Handling

### Error Type Hierarchy

#### Backend Error Types

```rust
#[derive(thiserror::Error, Debug)]
pub enum TransferError {
    #[error("Network error: {0}")]
    NetworkError(#[from] std::io::Error),
    
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
}
```

#### Frontend Error Handling

```typescript
export class TransferError extends Error {
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

export async function handleBackendError(error: any): Promise<TransferError> {
  // Parse backend error and convert to frontend error type
  if (typeof error === 'string') {
    return new TransferError(error, 'UNKNOWN_ERROR');
  }
  
  return new TransferError(
    error.message || 'Unknown error',
    error.code || 'UNKNOWN_ERROR',
    error.transferId,
    error.recoverable || false
  );
}
```

### Recovery Strategies

1. **Network Errors:** Exponential backoff retry with maximum attempts
2. **File Errors:** User notification with option to retry or select different file
3. **Checksum Errors:** Automatic re-transfer with user notification
4. **Timeout Errors:** Adjustable timeout based on network conditions
5. **Protocol Errors:** Connection reset and re-establishment

## Testing Strategy

### Unit Testing

#### Backend Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;
    use tempfile::NamedTempFile;
    
    #[tokio::test]
    async fn test_tcp_file_transfer() {
        let temp_file = NamedTempFile::new().unwrap();
        // Write test data
        
        let config = TransferConfig {
            mode: TransferMode::Transmitter,
            protocol: Protocol::Tcp,
            target_ip: Some("127.0.0.1".to_string()),
            port: 8080,
            filename: Some("test.txt".to_string()),
            chunk_size: 1024,
            timeout: Duration::from_secs(30),
        };
        
        // Test transfer logic
        let result = start_file_transfer(config, temp_file.path().to_string(), "127.0.0.1:8080".to_string()).await;
        assert!(result.is_ok());
    }
    
    #[test]
    fn test_checksum_calculation() {
        let test_data = b"Hello, World!";
        let expected = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        let mut hasher = Sha256::new();
        hasher.update(test_data);
        let result = format!("{:x}", hasher.finalize());
        
        assert_eq!(result, expected);
    }
}
```

#### Frontend Tests

```typescript
// tests/components/FileDropZone.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import FileDropZone from '$lib/components/FileDropZone.svelte';

test('handles file drop correctly', async () => {
  const { getByText, component } = render(FileDropZone);
  
  const dropzone = getByText(/drag & drop/i);
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  
  let selectedFiles: File[] = [];
  component.$on('filesSelected', (event) => {
    selectedFiles = event.detail;
  });
  
  await fireEvent.drop(dropzone, {
    dataTransfer: { files: [file] }
  });
  
  expect(selectedFiles).toHaveLength(1);
  expect(selectedFiles[0].name).toBe('test.txt');
});
```

### Integration Testing

#### Tauri Integration Tests

```rust
// backend/tests/integration/tauri_integration.rs
use backend::{start_file_transfer, TransferConfig, Protocol, TransferMode};
use std::time::Duration;

#[tokio::test]
async fn test_tauri_command_integration() {
    let config = TransferConfig {
        mode: TransferMode::Transmitter,
        protocol: Protocol::Tcp,
        target_ip: Some("127.0.0.1".to_string()),
        port: 8080,
        filename: Some("test.txt".to_string()),
        chunk_size: 1024,
        timeout: Duration::from_secs(30),
    };
    
    // This would be called by Tauri command
    let result = start_file_transfer(config, "test.txt".to_string(), "127.0.0.1:8080".to_string()).await;
    
    // Verify the result can be serialized for Tauri
    let serialized = serde_json::to_string(&result).unwrap();
    assert!(!serialized.is_empty());
}
```

### End-to-End Testing

```typescript
// tests/e2e/transfer-workflow.test.ts
import { test, expect } from '@playwright/test';

test('complete file transfer workflow', async ({ page }) => {
  await page.goto('/');
  
  // Select transmitter mode
  await page.click('[data-testid="transmitter-mode"]');
  
  // Configure connection
  await page.fill('[data-testid="target-ip"]', '127.0.0.1');
  await page.fill('[data-testid="port"]', '8080');
  await page.selectOption('[data-testid="protocol"]', 'tcp');
  
  // Select file
  const fileInput = page.locator('[data-testid="file-input"]');
  await fileInput.setInputFiles('test-files/sample.txt');
  
  // Start transfer
  await page.click('[data-testid="start-transfer"]');
  
  // Wait for transfer to complete
  await expect(page.locator('[data-testid="transfer-status"]')).toContainText('completed');
  
  // Verify success notification
  await expect(page.locator('[data-testid="success-notification"]')).toBeVisible();
});
```

This design provides a comprehensive foundation for implementing the file transfer application with clear separation of concerns, robust error handling, and thorough testing strategies. The modular architecture allows for independent development of backend and frontend components while maintaining strong integration through well-defined interfaces.