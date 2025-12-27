export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export const formatSpeed = (bytesPerSec: number): string => {
  return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`;
};

export const formatDate = (ms: number): string => {
  return new Date(ms).toLocaleString();
};
