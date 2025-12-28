import { Network } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import SelectInput from './SelectInput';

/**
 * Props for InterfaceSelector.
 */
interface InterfaceSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Component to select a network interface from the list of available interfaces.
 * Fetches interfaces from the backend on mount.
 */
const InterfaceSelector: React.FC<InterfaceSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className,
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
    <SelectInput
      value={value || ''}
      onChange={(val) => onChange(val || null)}
      options={interfaces.map((iface) => ({ value: iface, label: iface }))}
      disabled={disabled}
      loading={loading}
      placeholder="Auto (Default)"
      icon={<Network size={16} />}
      className={className}
    />
  );
};

export default InterfaceSelector;
