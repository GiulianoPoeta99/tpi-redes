import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import Button from './Button';

interface HeaderActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  color: 'blue' | 'purple';
}

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({
  label,
  icon: Icon,
  onClick,
  color,
}) => {
  const colorStyles = {
    blue: 'hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    purple: 'hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]',
  };

  const iconColors = {
    blue: 'bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 group-hover:text-blue-300',
    purple: 'bg-purple-500/10 group-hover:bg-purple-500/20 text-purple-400 group-hover:text-purple-300',
  };

  const iconElement = (
    <div className={`p-1.5 rounded-md transition-colors ${iconColors[color]}`}>
      <Icon size={18} />
    </div>
  );

  return (
    <Button
      variant="glass"
      className={`group active:scale-95 transition-all ${colorStyles[color]}`}
      onClick={onClick}
      icon={iconElement}
    >
      <span className="text-sm font-medium text-gray-300 group-hover:text-white">
        {label}
      </span>
    </Button>
  );
};

export default HeaderActionButton;
