import type React from 'react';
import { useEffect, useState } from 'react';

interface IpDisplayProps {
  ip?: string; // If not provided, will fetch internally
  variant?: 'purple' | 'red' | 'blue' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
  showLabel?: boolean;
}

const IpDisplay: React.FC<IpDisplayProps> = ({
  ip: providedIp,
  variant = 'purple',
  size = 'md',
  className = '',
  showLabel = true,
}) => {
  const [internalIp, setInternalIp] = useState('Loading...');

  const ip = providedIp ?? internalIp;

  useEffect(() => {
    if (!providedIp) {
      window.api
        .getLocalIp()
        .then(setInternalIp)
        .catch(() => setInternalIp('Error'));
    }
  }, [providedIp]);

  const variants = {
    purple: {
      container: 'bg-mode-rx-dim border-mode-rx/20',
      label: 'text-mode-rx',
      dot: 'bg-green-500',
    },
    red: {
      container: 'bg-red-900/10 border-red-500/20',
      label: 'text-red-400',
      dot: 'bg-green-500',
    },
    blue: {
      container: 'bg-blue-900/10 border-blue-500/20',
      label: 'text-blue-400',
      dot: 'bg-blue-500',
    },
    gray: {
      container: 'bg-gray-800 border-gray-700',
      label: 'text-gray-400',
      dot: 'bg-green-500',
    },
  };

  const sizes = {
    sm: {
      container: 'px-4 py-2 min-h-0', // Compact
      label: 'text-[10px] mb-0.5',
      value: 'text-sm font-bold',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      container: 'px-4 py-3 min-h-[74px]', // Reduced further
      label: 'text-xs mb-1',
      value: 'text-xl',
      dot: 'w-2 h-2',
    },
  };

  const style = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <div
      className={`border rounded-xl flex flex-col justify-center ${style.container} ${sizeStyle.container} ${className}`}
    >
      {showLabel && (
        <span className={`font-bold uppercase block ${style.label} ${sizeStyle.label}`}>
          My IP Address
        </span>
      )}
      <span
        className={`font-mono text-white tracking-wider flex items-center gap-2 ${sizeStyle.value}`}
      >
        {ip}
        <div className={`rounded-full animate-pulse ${style.dot} ${sizeStyle.dot}`} />
      </span>
    </div>
  );
};

export default IpDisplay;
