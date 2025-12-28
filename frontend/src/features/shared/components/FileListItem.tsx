import { FileText, Trash2 } from 'lucide-react';
import type React from 'react';
import Badge from './Badge';
import Button from './Button';

/**
 * Props for the FileListItem component.
 */
interface FileListItemProps {
  /**
   * The name of the file to display.
   */
  filename: string;
  /**
   * The size of the file (number in bytes or string).
   */
  size?: number | string;
  /**
   * Current status of the file operation.
   */
  status?: string;
  /**
   * Progress percentage (0-100) if applicable.
   */
  progress?: number;
  /**
   * Callback to remove the file.
   */
  onRemove?: () => void;
  /**
   * Callback when the item is clicked.
   */
  onClick?: () => void;
  className?: string;
  /**
   * Custom action element to display.
   */
  action?: React.ReactNode;
  /**
   * Custom icon to display.
   */
  icon?: React.ReactNode;
  /**
   * Additional detailed information to display.
   */
  details?: React.ReactNode;
  /**
   * Tailwind class for the icon style.
   * @default 'bg-blue-500/10 text-blue-400'
   */
  iconClassName?: string;
}

/**
 * A list item representing a file with status, progress, and actions.
 */
const FileListItem: React.FC<FileListItemProps> = ({
  filename,
  size,
  status,
  progress,
  onRemove,
  onClick,
  className = '',
  action,
  icon,
  details,
  iconClassName = 'bg-blue-500/10 text-blue-400',
}) => {
  const formatSize = (s: number | string) => {
    if (typeof s === 'string') return s;
    if (s === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(s) / Math.log(k));
    return `${Number.parseFloat((s / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <button
      type="button"
      className={`group bg-glass-surface backdrop-blur-sm border border-white/5 p-3 rounded-lg flex items-center justify-between hover:bg-glass-hover transition-colors w-full text-left ${className}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2 rounded-lg shrink-0 ${iconClassName}`}>
          {icon || <FileText size={18} />}
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-200 truncate">{filename}</p>
            {status && (
              <Badge
                variant={
                  status === 'completed' || status === 'success'
                    ? 'success'
                    : status === 'error' || status === 'failed'
                      ? 'error'
                      : status === 'uploading'
                        ? 'info'
                        : status === 'cancelled'
                          ? 'warning'
                          : 'neutral'
                }
                size="sm"
              >
                {status}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            {size !== undefined && <span>{formatSize(size)}</span>}
            {details}
          </div>
          {progress !== undefined && (
            <div className="w-full bg-gray-700 h-1 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </button>
  );
};

export default FileListItem;
