import { Search } from 'lucide-react';
import type React from 'react';
import Button from '../../shared/components/Button';
import InputGroup from '../../shared/components/InputGroup';
import IpInput from '../../shared/components/IpInput';
import PortInput from '../../shared/components/PortInput';

/**
 * Props for MitmTargetConfig.
 */
interface MitmTargetConfigProps {
  /**
   * The destination IP address to forward traffic to.
   */
  targetIp: string;
  /**
   * The destination port to forward traffic to.
   */
  targetPort: number | string;
  /**
   * Callback to update the target IP.
   */
  onIpChange: (val: string) => void;
  /**
   * Callback to update the target port.
   */
  onPortChange: (val: number | string) => void;
  /**
   * Callback to trigger network scan.
   */
  onScanClick: () => void;
  /**
   * Whether inputs are disabled.
   */
  disabled?: boolean;
}

/**
 * Configuration for the Forwarding Target (where the proxy sends data).
 * Includes inputs for IP, Port, and a specific Scan button.
 */
const MitmTargetConfig: React.FC<MitmTargetConfigProps> = ({
  targetIp,
  targetPort,
  onIpChange,
  onPortChange,
  onScanClick,
  disabled = false,
}) => {
  return (
    <InputGroup label="Forward Target" indicatorColor="bg-blue-500" className="h-full">
      <div className="flex items-end gap-2 w-full">
        <div className="flex-1 min-w-[140px]">
          <span className="text-xs text-gray-400 block mb-1">Target Host / IP</span>
          <IpInput value={targetIp} onChange={onIpChange} disabled={disabled} className="w-full" />
        </div>
        <div className="w-24 shrink-0">
          <span className="text-xs text-gray-400 block mb-1">Port</span>
          <PortInput
            value={targetPort}
            onChange={onPortChange}
            disabled={disabled}
            placeholder="8080"
          />
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={onScanClick}
          disabled={disabled}
          className="text-blue-400 border-gray-600 shrink-0 h-[42px] w-[42px]"
          title="Scan Network"
          icon={<Search size={18} />}
        />
      </div>
    </InputGroup>
  );
};

export default MitmTargetConfig;
