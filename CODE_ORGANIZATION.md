# Code Organization Principles

This document explains the code organization principles used in the file transfer application to maintain clean, maintainable, and well-structured code.

## Single Definition Principle

### Overview
Each file in the codebase follows the **Single Definition Principle**, meaning each file contains exactly one main definition (struct, enum, trait, component, class, or interface). This principle ensures:

- **Clear Responsibility**: Each file has a single, well-defined purpose
- **Easy Navigation**: Developers can quickly locate specific definitions
- **Reduced Coupling**: Dependencies are explicit and minimal
- **Better Maintainability**: Changes to one definition don't affect unrelated code

### Backend (Rust) Organization

#### File Structure Rules
1. **One Main Definition Per File**: Each `.rs` file contains exactly one main `struct`, `enum`, or `trait`
2. **Co-located Helpers**: Related helper functions and implementations are included in the same file as their main definition
3. **Snake Case Naming**: Files use `snake_case` naming that matches the main definition (e.g., `transfer_config.rs` for `TransferConfig`)
4. **Module Exports**: Each module has a `mod.rs` file that re-exports public items

#### Example Structure
```
backend/src/core/transfer/
├── mod.rs                          # Module exports and re-exports
├── transfer_orchestrator.rs        # TransferOrchestrator struct + helpers
├── transfer_progress.rs             # TransferProgress struct + helpers
├── transfer_status.rs               # TransferStatus enum + helpers
├── network_log_entry.rs             # NetworkLogEntry struct + LogLevel/LogCategory enums
├── transfer_history_record.rs       # TransferHistoryRecord struct + related enums
├── history_filter.rs                # HistoryFilter struct + methods
└── transfer_history_utils.rs        # Helper functions for history management
```

#### Before and After Reorganization

**Before (Violating Single Definition Principle):**
```rust
// transfer_logger.rs - Multiple main definitions
pub struct NetworkLogEntry { ... }
pub enum LogLevel { ... }
pub enum LogCategory { ... }
pub struct TransferLogger { ... }
```

**After (Following Single Definition Principle):**
```rust
// network_log_entry.rs - Single main definition with related types
pub struct NetworkLogEntry { ... }
pub enum LogLevel { ... }      // Related to NetworkLogEntry
pub enum LogCategory { ... }   // Related to NetworkLogEntry

// transfer_logger.rs - Single main definition
pub struct TransferLogger { ... }
```

### Frontend (TypeScript/Svelte) Organization

#### File Structure Rules
1. **One Main Definition Per File**: Each file contains exactly one main component, class, or interface
2. **Kebab Case for Types**: TypeScript files use `kebab-case` (e.g., `transfer-config.ts`)
3. **PascalCase for Components**: Svelte components use `PascalCase` (e.g., `ModeSelector.svelte`)
4. **Index Files**: Use `index.ts` files for module re-exports

#### Example Structure
```
frontend/src/lib/types/
├── index.ts                        # Re-exports all types
├── transfer-progress.ts             # TransferProgress interface + TransferStatus type
├── transfer-config.ts               # TransferConfig interface + related types
├── transfer-config-validator.ts     # TransferConfigValidator class
├── transfer-record.ts               # TransferRecord + TransferResult interfaces
└── transfer-utils.ts                # TransferUtils class
```

#### Before and After Reorganization

**Before (Violating Single Definition Principle):**
```typescript
// types.ts - Multiple main definitions
export interface TransferProgress { ... }
export interface TransferConfig { ... }
export interface TransferRecord { ... }
export class TransferConfigValidator { ... }
export class TransferUtils { ... }
```

**After (Following Single Definition Principle):**
```typescript
// transfer-progress.ts - Single main definition with related types
export interface TransferProgress { ... }
export type TransferStatus = ...;  // Related to TransferProgress

// transfer-config.ts - Single main definition with related types
export interface TransferConfig { ... }
export type Protocol = ...;        // Related to TransferConfig
export type TransferMode = ...;    // Related to TransferConfig

// transfer-config-validator.ts - Single main definition
export class TransferConfigValidator { ... }
```

## Module Organization

### Backend Modules
Each module follows a clear hierarchy:

```
src/
├── config/                 # Configuration types and validation
│   ├── mod.rs
│   ├── transfer_config.rs  # TransferConfig struct
│   ├── protocol.rs         # Protocol enum
│   └── transfer_mode.rs    # TransferMode enum
├── core/
│   ├── transfer/           # Transfer-related functionality
│   ├── files/              # File operations
│   └── api/                # Public API interfaces
├── network/                # Network protocol implementations
├── crypto/                 # Cryptographic operations
├── errors/                 # Error handling and recovery
└── utils/                  # Utility functions and helpers
```

### Frontend Modules
The frontend follows a feature-based organization:

```
src/lib/
├── components/             # Svelte components (one per file)
├── stores/                 # State management
├── types/                  # Type definitions (organized by domain)
├── services/               # Business logic services
├── tauri/                  # Tauri integration utilities
└── utils/                  # Utility functions
```

## Benefits of This Organization

### 1. **Improved Discoverability**
- Developers can quickly find specific definitions
- File names clearly indicate their contents
- Related functionality is co-located

### 2. **Reduced Cognitive Load**
- Each file has a single, clear purpose
- No need to scan through multiple unrelated definitions
- Easier to understand dependencies

### 3. **Better Testing**
- Each definition can be tested in isolation
- Test files can mirror the source structure
- Easier to achieve comprehensive coverage

### 4. **Enhanced Maintainability**
- Changes to one definition don't affect others
- Refactoring is safer and more predictable
- Dependencies are explicit and minimal

### 5. **Improved Compilation Performance**
- Smaller compilation units
- Better incremental compilation
- Reduced rebuild times during development

## Migration Guidelines

When adding new functionality:

1. **Create New Files**: Don't add multiple main definitions to existing files
2. **Follow Naming Conventions**: Use consistent naming patterns
3. **Update Module Exports**: Add new files to appropriate `mod.rs` or `index.ts`
4. **Maintain Backward Compatibility**: Use re-exports when reorganizing existing code
5. **Document Changes**: Update this document when introducing new patterns

## Enforcement

This organization is enforced through:

1. **Code Reviews**: All new code must follow these principles
2. **Documentation**: This document serves as the authoritative guide
3. **Linting Rules**: Automated checks where possible
4. **Team Standards**: Consistent application across the team

## Examples of Good Organization

### Good: Single Definition with Related Helpers
```rust
// transfer_config.rs
pub struct TransferConfig {
    // ... fields
}

impl TransferConfig {
    // Helper methods related to TransferConfig
    pub fn new() -> Self { ... }
    pub fn validate(&self) -> Result<(), String> { ... }
}

// Helper functions related to TransferConfig
pub fn default_config() -> TransferConfig { ... }
```

### Bad: Multiple Unrelated Definitions
```rust
// config.rs - DON'T DO THIS
pub struct TransferConfig { ... }
pub struct NetworkSettings { ... }  // Unrelated to TransferConfig
pub enum LogLevel { ... }            // Unrelated to both above
```

This organization ensures that the codebase remains clean, maintainable, and easy to navigate as it grows in complexity.