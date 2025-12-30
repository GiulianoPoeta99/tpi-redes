import { Search } from 'lucide-react';
import type React from 'react';
import { DEFAULT_HOST } from '../../../config/constants';
import Button from '../../shared/components/Button';
import InputGroup from '../../shared/components/InputGroup';
import IpInput from '../../shared/components/IpInput';

/**
 * Props for the TargetConfig component.
 */
interface TargetConfigProps {
  /**
   * Destination IP address.
   */
  ip: string;
  /**
   * Callback to update IP.
   */
  setIp: (val: string) => void;
  /**
   * Callback to initiate a network scan.
   */
  onScan: () => void;
  disabled?: boolean;
}

/**
 * A configuration control for entering or scanning for the target IP address.
 */
const TargetConfig: React.FC<TargetConfigProps> = ({ ip, setIp, onScan, disabled = false }) => {
  return (
    <InputGroup label="Target Config" indicatorColor="bg-blue-500">
      <div className="flex-1">
        <span className="text-xs text-gray-400 block mb-1">Destination IP</span>
        <div className="flex gap-2">
          <IpInput
            value={ip}
            onChange={setIp}
            placeholder={DEFAULT_HOST}
            className="flex-1"
            disabled={disabled}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={onScan}
            disabled={disabled}
            className="text-blue-400 border-gray-600"
            title="Scan Network"
            icon={<Search size={20} />}
          />
        </div>
      </div>
    </InputGroup>
  );
};

export default TargetConfig;
