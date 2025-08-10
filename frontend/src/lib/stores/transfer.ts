// Transfer state management store with real-time event handling
import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { 
  TransferProgress, 
  TransferConfig, 
  TransferRecord, 
  TransferStatus,
  TransferResult 
} from '../types';
import { 
  eventManager,
  type TransferStartedEvent,
  type TransferProgressEvent,
  type TransferErrorEvent,
  type TransferCompletedEvent,
  type TransferCancelledEvent,
  type TransferConnectionEvent
} from '../tauri-events';
import { TauriCommands } from '../tauri-commands';
import { TransferError } from '../error-handling';

interface TransferState {
  currentTransfer: TransferProgress | null;
  history: TransferRecord[];
  config: TransferConfig;
  isInitialized: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'listening';
  lastError: TransferError | null;
}

const defaultConfig: TransferConfig = {
  mode: 'Transmitter',
  protocol: 'Tcp',
  port: 8080,
  chunk_size: 8192,
  timeout: 30,
};

const HISTORY_STORAGE_KEY = 'file-transfer-history';
const MAX_HISTORY_ITEMS = 100;

// Create the main transfer store
function createTransferStore() {
  const { subscribe, set, update } = writable<TransferState>({
    currentTransfer: null,
    history: [],
    config: defaultConfig,
    isInitialized: false,
    connectionStatus: 'disconnected',
    lastError: null
  });

  return {
    subscribe,
    set,
    update,

    // Initialize the store and set up event listeners
    async initialize(): Promise<void> {
      if (!browser) return;

      try {
        // Load history from localStorage
        this.loadHistory();

        // Initialize backend
        await TauriCommands.initializeBackend();

        // Set up event listeners
        await eventManager.setupEventListeners({
          onStarted: this.handleTransferStarted.bind(this),
          onProgress: this.handleTransferProgress.bind(this),
          onError: this.handleTransferError.bind(this),
          onCompleted: this.handleTransferCompleted.bind(this),
          onCancelled: this.handleTransferCancelled.bind(this),
          onConnection: this.handleConnectionEvent.bind(this)
        });

        update(state => ({ ...state, isInitialized: true }));
      } catch (error) {
        console.error('Failed to initialize transfer store:', error);
        const transferError = new TransferError(
          `Initialization failed: ${error}`,
          'INIT_ERROR',
          undefined,
          false
        );
        update(state => ({ ...state, lastError: transferError }));
      }
    },

    // Clean up event listeners
    async cleanup(): Promise<void> {
      await eventManager.cleanup();
      update(state => ({ ...state, isInitialized: false }));
    },

    // Event handlers
    handleTransferStarted(event: TransferStartedEvent): void {
      update(state => ({
        ...state,
        currentTransfer: {
          transfer_id: event.transfer_id,
          progress: 0,
          speed: 0,
          eta: 0,
          status: 'Connecting' as TransferStatus,
          bytes_transferred: 0,
          total_bytes: event.file_size
        },
        lastError: null
      }));
    },

    handleTransferProgress(event: TransferProgressEvent): void {
      update(state => {
        if (!state.currentTransfer || state.currentTransfer.transfer_id !== event.transfer_id) {
          return state;
        }

        return {
          ...state,
          currentTransfer: {
            ...state.currentTransfer,
            progress: event.progress,
            speed: event.speed,
            eta: event.eta,
            bytes_transferred: event.bytes_transferred,
            total_bytes: event.total_bytes,
            status: 'Transferring' as TransferStatus
          }
        };
      });
    },

    handleTransferError(event: TransferErrorEvent): void {
      const transferError = new TransferError(
        event.error_message,
        event.error_code,
        event.transfer_id,
        event.recoverable
      );

      update(state => {
        const updatedState = { ...state, lastError: transferError };

        if (state.currentTransfer && state.currentTransfer.transfer_id === event.transfer_id) {
          updatedState.currentTransfer = {
            ...state.currentTransfer,
            status: 'Error' as TransferStatus,
            error: event.error_message
          };

          // Add to history
          const historyRecord: TransferRecord = {
            id: event.transfer_id,
            filename: state.config.filename || 'Unknown',
            size: state.currentTransfer.total_bytes,
            mode: state.config.mode === 'Transmitter' ? 'sent' : 'received',
            protocol: state.config.protocol.toLowerCase() as 'tcp' | 'udp',
            target: state.config.target_ip || `localhost:${state.config.port}`,
            status: 'failed',
            timestamp: new Date(event.timestamp),
            duration: 0,
            checksum: '',
            error: event.error_message
          };

          updatedState.history = [historyRecord, ...state.history].slice(0, MAX_HISTORY_ITEMS);
          this.saveHistory(updatedState.history);
        }

        return updatedState;
      });
    },

    handleTransferCompleted(event: TransferCompletedEvent): void {
      update(state => {
        if (!state.currentTransfer || state.currentTransfer.transfer_id !== event.transfer_id) {
          return state;
        }

        const completedTransfer = {
          ...state.currentTransfer,
          status: 'Completed' as TransferStatus,
          progress: 1.0,
          bytes_transferred: event.bytes_transferred
        };

        // Add to history
        const historyRecord: TransferRecord = {
          id: event.transfer_id,
          filename: state.config.filename || 'Unknown',
          size: event.bytes_transferred,
          mode: state.config.mode === 'Transmitter' ? 'sent' : 'received',
          protocol: state.config.protocol.toLowerCase() as 'tcp' | 'udp',
          target: state.config.target_ip || `localhost:${state.config.port}`,
          status: event.success ? 'completed' : 'failed',
          timestamp: new Date(event.timestamp),
          duration: event.duration,
          checksum: event.checksum
        };

        const updatedHistory = [historyRecord, ...state.history].slice(0, MAX_HISTORY_ITEMS);
        this.saveHistory(updatedHistory);

        return {
          ...state,
          currentTransfer: completedTransfer,
          history: updatedHistory,
          lastError: null
        };
      });

      // Clear current transfer after a delay
      setTimeout(() => {
        update(state => ({ ...state, currentTransfer: null }));
      }, 3000);
    },

    handleTransferCancelled(event: TransferCancelledEvent): void {
      update(state => {
        if (!state.currentTransfer || state.currentTransfer.transfer_id !== event.transfer_id) {
          return state;
        }

        // Add to history
        const historyRecord: TransferRecord = {
          id: event.transfer_id,
          filename: state.config.filename || 'Unknown',
          size: state.currentTransfer.bytes_transferred,
          mode: state.config.mode === 'Transmitter' ? 'sent' : 'received',
          protocol: state.config.protocol.toLowerCase() as 'tcp' | 'udp',
          target: state.config.target_ip || `localhost:${state.config.port}`,
          status: 'cancelled',
          timestamp: new Date(event.timestamp),
          duration: 0,
          checksum: ''
        };

        const updatedHistory = [historyRecord, ...state.history].slice(0, MAX_HISTORY_ITEMS);
        this.saveHistory(updatedHistory);

        return {
          ...state,
          currentTransfer: {
            ...state.currentTransfer,
            status: 'Cancelled' as TransferStatus
          },
          history: updatedHistory
        };
      });

      // Clear current transfer after a delay
      setTimeout(() => {
        update(state => ({ ...state, currentTransfer: null }));
      }, 2000);
    },

    handleConnectionEvent(event: TransferConnectionEvent): void {
      update(state => ({
        ...state,
        connectionStatus: event.event_type as any
      }));
    },

    // History management
    loadHistory(): void {
      if (!browser) return;

      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const history = JSON.parse(stored) as TransferRecord[];
          // Convert timestamp strings back to Date objects
          const parsedHistory = history.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp)
          }));
          update(state => ({ ...state, history: parsedHistory }));
        }
      } catch (error) {
        console.warn('Failed to load transfer history:', error);
      }
    },

    saveHistory(history: TransferRecord[]): void {
      if (!browser) return;

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save transfer history:', error);
      }
    },

    // Clear error state
    clearError(): void {
      update(state => ({ ...state, lastError: null }));
    },

    // Clear history
    clearHistory(): void {
      update(state => ({ ...state, history: [] }));
      if (browser) {
        try {
          localStorage.removeItem(HISTORY_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear history storage:', error);
        }
      }
    },

    // Update configuration
    updateConfig(newConfig: Partial<TransferConfig>): void {
      update(state => ({
        ...state,
        config: { ...state.config, ...newConfig }
      }));
    }
  };
}

export const transferStore = createTransferStore();

// Derived stores for specific aspects of the state
export const currentTransfer = derived(
  transferStore,
  $transferStore => $transferStore.currentTransfer
);

export const transferHistory = derived(
  transferStore,
  $transferStore => $transferStore.history
);

export const connectionStatus = derived(
  transferStore,
  $transferStore => $transferStore.connectionStatus
);

export const lastError = derived(
  transferStore,
  $transferStore => $transferStore.lastError
);

export const isTransferActive = derived(
  currentTransfer,
  $currentTransfer => $currentTransfer !== null && 
    ($currentTransfer.status === 'Connecting' || $currentTransfer.status === 'Transferring')
);

// Enhanced transfer actions with event integration
export const transferActions = {
  async startTransfer(config: TransferConfig, filePath: string): Promise<void> {
    try {
      transferStore.clearError();
      
      if (config.mode === 'Transmitter') {
        const target = `${config.target_ip}:${config.port}`;
        await TauriCommands.transferFile(config, filePath, target);
      } else {
        await TauriCommands.receiveFile(config.port, config.protocol, './downloads');
      }
    } catch (error) {
      const transferError = new TransferError(
        `Failed to start transfer: ${error}`,
        'START_ERROR',
        undefined,
        true
      );
      transferStore.update(state => ({ ...state, lastError: transferError }));
      throw transferError;
    }
  },
  
  async cancelTransfer(): Promise<void> {
    const state = get(transferStore);
    if (!state.currentTransfer) {
      throw new Error('No active transfer to cancel');
    }

    try {
      await TauriCommands.cancelTransfer(state.currentTransfer.transfer_id);
    } catch (error) {
      const transferError = new TransferError(
        `Failed to cancel transfer: ${error}`,
        'CANCEL_ERROR',
        state.currentTransfer.transfer_id,
        true
      );
      transferStore.update(state => ({ ...state, lastError: transferError }));
      throw transferError;
    }
  },
  
  updateConfig(newConfig: Partial<TransferConfig>): void {
    transferStore.updateConfig(newConfig);
  },

  clearError(): void {
    transferStore.clearError();
  },

  clearHistory(): void {
    transferStore.clearHistory();
  }
};

// Auto-initialize when in browser environment
if (browser) {
  transferStore.initialize();
}