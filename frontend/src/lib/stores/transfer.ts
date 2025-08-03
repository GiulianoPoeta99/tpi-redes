// Transfer state management store
import { writable, get } from 'svelte/store';
import type { TransferProgress, TransferConfig, TransferRecord } from '../types';

interface TransferState {
  currentTransfer: TransferProgress | null;
  history: TransferRecord[];
  config: TransferConfig;
}

const defaultConfig: TransferConfig = {
  mode: 'Transmitter',
  protocol: 'Tcp',
  port: 8080,
  chunk_size: 8192,
  timeout: 30,
};

export const transferStore = writable<TransferState>({
  currentTransfer: null,
  history: [],
  config: defaultConfig
});

// Store actions will be implemented in later tasks
export const transferActions = {
  async startTransfer(config: TransferConfig, filePath: string): Promise<void> {
    // Implementation will be added in task 9
    console.log('Starting transfer:', { config, filePath });
  },
  
  async cancelTransfer(): Promise<void> {
    // Implementation will be added in task 9
    console.log('Cancelling transfer');
  },
  
  updateConfig(newConfig: Partial<TransferConfig>): void {
    transferStore.update(state => ({
      ...state,
      config: { ...state.config, ...newConfig }
    }));
  }
};