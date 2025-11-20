import { FileText, Trash2 } from 'lucide-react';
import type React from 'react';
import Badge from './Badge';
import Button from './Button';

interface FileListItemProps {
  filename: string;
  size?: number | string;
  status?: string;
  progress?: number;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  details?: React.ReactNode;
  iconClassName?: string;
}

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
  iconClassName = 'bg-status-info-bg text-status-info-text',
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
    // biome-ignore lint/a11y/noStaticElementInteractions: List item
    <div
      className={`group bg-glass-surface backdrop-blur-sm border border-glass-border p-3 rounded-lg flex items-center justify-between hover:bg-glass-hover transition-colors ${className}`}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      tabIndex={onClick ? 0 : undefined}
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
                    : status === 'error'
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
            className="text-gray-400 hover:text-status-error-text hover:bg-status-error-bg"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileListItem;
