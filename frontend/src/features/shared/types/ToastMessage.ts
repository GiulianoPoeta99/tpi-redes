import type { ToastType } from './ToastType';

/**
 * Represents a single toast notification message.
 *
 * @property id - Unique identifier.
 * @property type - Type of toast (success, error, info).
 * @property title - Title of the toast.
 * @property description - Optional description.
 */
export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}
