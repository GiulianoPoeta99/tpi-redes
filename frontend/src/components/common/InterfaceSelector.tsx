import { ChevronDown, Network } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

interface InterfaceSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

const InterfaceSelector: React.FC<InterfaceSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInterfaces = async () => {
      setLoading(true);
      try {
        const list = await window.api.getInterfaces();
        setInterfaces(list || []);
      } catch (err) {
        console.error('Failed to fetch interfaces:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterfaces();
  }, []);

  return (
    <div className="relative group min-w-[120px]">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
        <Network size={16} />
      </div>
      <select
        className={`w-full bg-gray-900/50 border border-gray-700 text-gray-200 text-sm rounded-lg pl-9 pr-8 py-2 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
        }`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">Auto (Default)</option>
        {loading ? (
          <option disabled>Loading...</option>
        ) : (
          interfaces.map((iface) => (
            <option key={iface} value={iface}>
              {iface}
            </option>
          ))
        )}
      </select>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
        <ChevronDown size={14} />
      </div>
    </div>
  );
};

export default InterfaceSelector;
