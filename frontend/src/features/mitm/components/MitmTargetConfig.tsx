import { Search } from 'lucide-react';
import type React from 'react';
import { DEFAULT_HOST, DEFAULT_TARGET_PORT } from '../../../config/constants';
import Button from '../../shared/components/Button';
import InputGroup from '../../shared/components/InputGroup';
import IpInput from '../../shared/components/IpInput';
import PortInput from '../../shared/components/PortInput';

/**
 * Props for MitmTargetConfig.
 *
 * @property targetIp - The destination IP address to forward traffic to.
 * @property targetPort - The destination port to forward traffic to.
 * @property onIpChange - Callback to update the target IP.
 * @property onPortChange - Callback to update the target port.
 * @property onScanClick - Callback to trigger network scan.
 * @property disabled - Whether inputs are disabled.
 */
interface MitmTargetConfigProps {
  targetIp: string;
  targetPort: number | string;
  onIpChange: (val: string) => void;
  onPortChange: (val: number | string) => void;
  onScanClick: () => void;
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
      <div className="grid w-full grid-cols-1 sm:grid-cols-[minmax(0,1fr)_6rem_auto] gap-2 items-end">
        <div className="min-w-0">
          <span className="text-xs text-gray-400 block mb-1">Target Host / IP</span>
          <IpInput
            value={targetIp}
            onChange={onIpChange}
            disabled={disabled}
            className="w-full"
            placeholder={DEFAULT_HOST}
          />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-gray-400 block mb-1">Port</span>
          <PortInput
            value={targetPort}
            onChange={onPortChange}
            disabled={disabled}
            placeholder={String(DEFAULT_TARGET_PORT)}
          />
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={onScanClick}
          disabled={disabled}
          className="text-blue-400 border-gray-600 shrink-0 h-10 w-10"
          title="Scan Network"
          icon={<Search size={18} />}
        />
      </div>
    </InputGroup>
  );
};

export default MitmTargetConfig;
