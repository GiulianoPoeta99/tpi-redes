// Tauri command interface
import { invoke } from '@tauri-apps/api/core';
import type { TransferConfig, TransferProgress } from './types';

export interface TauriCommands {
  transfer_file(config: TransferConfig, filePath: string, target: string): Promise<string>;
  receive_file(port: number, protocol: string, outputDir: string): Promise<string>;
  get_progress(transferId: string): Promise<TransferProgress>;
  cancel_transfer_cmd(transferId: string): Promise<void>;
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
  
  async cancel_transfer_cmd(transferId) {
    return await invoke('cancel_transfer_cmd', { transferId });
  }
};