import { Search } from 'lucide-react';
import type React from 'react';
import Button from './Button';
import InputGroup from './InputGroup';
import IpInput from './IpInput';

interface TargetConfigProps {
  ip: string;
  setIp: (val: string) => void;
  onScan: () => void;
  disabled?: boolean;
}

const TargetConfig: React.FC<TargetConfigProps> = ({ ip, setIp, onScan, disabled = false }) => {
  return (
    <InputGroup label="Target Config" indicatorColor="bg-blue-500">
      <div className="flex-1">
        <span className="text-xs text-gray-400 block mb-1">Destination IP</span>
        <div className="flex gap-2">
          <IpInput
            value={ip}
            onChange={setIp}
            placeholder="e.g. 192.168.1.5"
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
