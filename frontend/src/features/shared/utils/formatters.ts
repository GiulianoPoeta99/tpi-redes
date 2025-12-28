/**
 * Utility class for formatting common data types.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Utility class pattern preferred for grouping static formatters
export class Formatters {
  /**
   * Formats a number of bytes into a human-readable string (e.g., "1.5 MB").
   *
   * @param bytes - The size in bytes.
   * @returns Formatted string with appropriate unit.
   */
  static bytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Formats a transfer speed in MB/s.
   *
   * @param bytesPerSec - Speed in bytes per second.
   * @returns Formatted string (e.g., "5.20 MB/s").
   */
  static speed(bytesPerSec: number): string {
    return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`;
  }

  /**
   * Formats a timestamp into a localized date string.
   *
   * @param ms - Unix timestamp in milliseconds.
   * @returns Localized date and time string.
   */
  static date(ms: number): string {
    return new Date(ms).toLocaleString();
  }
}
