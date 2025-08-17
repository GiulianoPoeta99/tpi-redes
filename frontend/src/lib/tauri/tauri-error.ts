// Error type returned by Tauri commands
export interface TauriError {
  message: string;
  code: string;
}