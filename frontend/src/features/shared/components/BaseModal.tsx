import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import type React from 'react';

/**
 * Props for the BaseModal component.
 *
 * @property isOpen - Whether the modal is currently open.
 * @property onClose - Callback function to handle closing the modal.
 * @property title - The title displayed in the modal header.
 * @property icon - Optional icon to display next to the title.
 * @property description - Optional description text displayed below the title.
 * @property size - The width size of the modal. Defaults to 'md'.
 * @property headerContent - Optional custom content to display in the header (e.g., actions).
 * @property children - The content of the modal.
 */
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: LucideIcon;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  headerContent?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A flexible modal dialog component with a backdrop and standardized header/content layout.
 */
const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  description,
  size = 'md',
  headerContent,
  children,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95%] h-[90dvh]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-default w-full h-full border-0 p-0"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div
        className={`relative w-full ${sizeClasses[size]} bg-gray-900/95 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0 bg-gray-900/50">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <Icon size={20} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
              {description && <p className="text-xs text-gray-400">{description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerContent}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
};

export default BaseModal;
