/**
 * @fileoverview Type definitions for the File Transfer Application frontend.
 * 
 * This module provides a centralized export point for all TypeScript type definitions
 * used throughout the frontend application. It includes types for transfer configuration,
 * progress monitoring, error handling, and utility functions.
 * 
 * ## Core Types
 * 
 * - **TransferConfig**: Configuration for transfer operations
 * - **TransferProgress**: Real-time progress information
 * - **TransferRecord**: Historical transfer data
 * - **TransferError**: Error handling and recovery
 * 
 * ## Usage
 * 
 * ```typescript
 * import { TransferConfig, TransferProgress, TransferError } from '$lib/types';
 * 
 * const config: TransferConfig = {
 *   mode: 'transmitter',
 *   protocol: 'tcp',
 *   port: 8080,
 *   // ... other options
 * };
 * ```
 * 
 * @author File Transfer Team
 * @version 1.0.0
 */

// Transfer progress and monitoring types
export * from './transfer-progress';

// Transfer configuration and validation types
export * from './transfer-config';
export * from './transfer-config-validator';

// Transfer history and record types
export * from './transfer-record';

// Utility types and helper functions
export * from './transfer-utils';

// Error handling types (re-exported for convenience)
export { TransferError } from '../error-handling';