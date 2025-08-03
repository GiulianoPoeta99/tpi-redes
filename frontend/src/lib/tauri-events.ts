// Tauri event handling for transfer events
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// Event payload types matching backend events
export interface TransferStartedEvent {
  transfer_id: string;
  filename: string;
  file_size: number;
  protocol: 'Tcp' | 'Udp';
  mode: 'Transmitter' | 'Receiver';
  timestamp: number;
}

export interface TransferProgressEvent {
  transfer_id: string;
  progress: number; // 0.0 - 1.0
  speed: number; // bytes per second
  eta: number; // seconds remaining
  bytes_transferred: number;
  total_bytes: number;
  timestamp: number;
}

export interface TransferErrorEvent {
  transfer_id: string;
  error_message: string;
  error_code: string;
  recoverable: boolean;
  timestamp: number;
}

export interface TransferCompletedEvent {
  transfer_id: string;
  success: boolean;
  bytes_transferred: number;
  duration: number; // seconds
  checksum: string;
  timestamp: number;
}

export interface TransferCancelledEvent {
  transfer_id: string;
  reason: string;
  timestamp: number;
}

export interface TransferConnectionEvent {
  transfer_id?: string;
  event_type: 'connecting' | 'connected' | 'disconnected' | 'listening';
  address: string;
  protocol: 'Tcp' | 'Udp';
  timestamp: number;
}

// Union type for all transfer events
export type TransferEvent = 
  | { type: 'Started'; data: TransferStartedEvent }
  | { type: 'Progress'; data: TransferProgressEvent }
  | { type: 'Error'; data: TransferErrorEvent }
  | { type: 'Completed'; data: TransferCompletedEvent }
  | { type: 'Cancelled'; data: TransferCancelledEvent }
  | { type: 'Connection'; data: TransferConnectionEvent };

// Event listener callbacks
export type TransferEventCallback<T> = (event: T) => void;

export interface TransferEventListeners {
  onStarted?: TransferEventCallback<TransferStartedEvent>;
  onProgress?: TransferEventCallback<TransferProgressEvent>;
  onError?: TransferEventCallback<TransferErrorEvent>;
  onCompleted?: TransferEventCallback<TransferCompletedEvent>;
  onCancelled?: TransferEventCallback<TransferCancelledEvent>;
  onConnection?: TransferEventCallback<TransferConnectionEvent>;
}

// Event manager class
export class TauriEventManager {
  private unlistenFunctions: UnlistenFn[] = [];

  /**
   * Set up event listeners for all transfer events
   * @param listeners Object containing callback functions for each event type
   */
  async setupEventListeners(listeners: TransferEventListeners): Promise<void> {
    // Clear existing listeners
    await this.cleanup();

    // Set up transfer started events
    if (listeners.onStarted) {
      const unlisten = await listen<TransferStartedEvent>('transfer-started', (event) => {
        listeners.onStarted!(event.payload);
      });
      this.unlistenFunctions.push(unlisten);
    }

    // Set up transfer progress events
    if (listeners.onProgress) {
      const unlisten = await listen<TransferProgressEvent>('transfer-progress', (event) => {
        listeners.onProgress!(event.payload);
      });
      this.unlistenFunctions.push(unlisten);
    }

    // Set up transfer error events
    if (listeners.onError) {
      const unlisten = await listen<TransferErrorEvent>('transfer-error', (event) => {
        listeners.onError!(event.payload);
      });
      this.unlistenFunctions.push(unlisten);
    }

    // Set up transfer completed events
    if (listeners.onCompleted) {
      const unlisten = await listen<TransferCompletedEvent>('transfer-completed', (event) => {
        listeners.onCompleted!(event.payload);
      });
      this.unlistenFunctions.push(unlisten);
    }

    // Set up transfer cancelled events
    if (listeners.onCancelled) {
      const unlisten = await listen<TransferCancelledEvent>('transfer-cancelled', (event) => {
        listeners.onCancelled!(event.payload);
      });
      this.unlistenFunctions.push(unlisten);
    }

    // Set up connection events
    if (listeners.onConnection) {
      const unlisten = await listen<TransferConnectionEvent>('transfer-connection', (event) => {
        listeners.onConnection!(event.payload);
      });
      this.unlistenFunctions.push(unlisten);
    }
  }

  /**
   * Set up a listener for a specific event type
   * @param eventType Type of event to listen for
   * @param callback Callback function to execute when event occurs
   */
  async listenToEvent<T extends keyof TransferEventListeners>(
    eventType: T,
    callback: NonNullable<TransferEventListeners[T]>
  ): Promise<UnlistenFn> {
    const eventName = this.getEventName(eventType);
    const unlisten = await listen(eventName, (event) => {
      (callback as any)(event.payload);
    });
    
    this.unlistenFunctions.push(unlisten);
    return unlisten;
  }

  /**
   * Clean up all event listeners
   */
  async cleanup(): Promise<void> {
    for (const unlisten of this.unlistenFunctions) {
      unlisten();
    }
    this.unlistenFunctions = [];
  }

  private getEventName(eventType: keyof TransferEventListeners): string {
    switch (eventType) {
      case 'onStarted': return 'transfer-started';
      case 'onProgress': return 'transfer-progress';
      case 'onError': return 'transfer-error';
      case 'onCompleted': return 'transfer-completed';
      case 'onCancelled': return 'transfer-cancelled';
      case 'onConnection': return 'transfer-connection';
      default: throw new Error(`Unknown event type: ${eventType}`);
    }
  }
}

// Singleton instance for global use
export const eventManager = new TauriEventManager();

// Convenience functions for setting up individual listeners
export async function onTransferStarted(callback: TransferEventCallback<TransferStartedEvent>): Promise<UnlistenFn> {
  return await listen<TransferStartedEvent>('transfer-started', (event) => {
    callback(event.payload);
  });
}

export async function onTransferProgress(callback: TransferEventCallback<TransferProgressEvent>): Promise<UnlistenFn> {
  return await listen<TransferProgressEvent>('transfer-progress', (event) => {
    callback(event.payload);
  });
}

export async function onTransferError(callback: TransferEventCallback<TransferErrorEvent>): Promise<UnlistenFn> {
  return await listen<TransferErrorEvent>('transfer-error', (event) => {
    callback(event.payload);
  });
}

export async function onTransferCompleted(callback: TransferEventCallback<TransferCompletedEvent>): Promise<UnlistenFn> {
  return await listen<TransferCompletedEvent>('transfer-completed', (event) => {
    callback(event.payload);
  });
}

export async function onTransferCancelled(callback: TransferEventCallback<TransferCancelledEvent>): Promise<UnlistenFn> {
  return await listen<TransferCancelledEvent>('transfer-cancelled', (event) => {
    callback(event.payload);
  });
}

export async function onTransferConnection(callback: TransferEventCallback<TransferConnectionEvent>): Promise<UnlistenFn> {
  return await listen<TransferConnectionEvent>('transfer-connection', (event) => {
    callback(event.payload);
  });
}