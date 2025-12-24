import type React from 'react';
import { useEffect, useState } from 'react';

interface IpDisplayProps {
  ip?: string; // If not provided, will fetch internally
  variant?: 'purple' | 'red' | 'blue' | 'gray';
  className?: string;
  showLabel?: boolean;
}

const IpDisplay: React.FC<IpDisplayProps> = ({
  ip: providedIp,
  variant = 'purple',
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

  const style = variants[variant];

  return (
    <div
      className={`p-4 border rounded-xl flex flex-col justify-center min-h-[84px] ${style.container} ${className}`}
    >
      {showLabel && (
        <span className={`text-xs font-bold uppercase block mb-1 ${style.label}`}>
          My IP Address
        </span>
      )}
      <span className="text-xl font-mono text-white tracking-wider flex items-center gap-2">
        {ip}
        <div className={`w-2 h-2 rounded-full animate-pulse ${style.dot}`} />
      </span>
    </div>
  );
};

export default IpDisplay;
