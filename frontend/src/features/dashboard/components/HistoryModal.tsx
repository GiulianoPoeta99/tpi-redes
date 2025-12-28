import { ArrowDown, ArrowUp, Clock, Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import BaseModal from '../../shared/components/BaseModal';
import Button from '../../shared/components/Button';
import EmptyState from '../../shared/components/EmptyState';
import FileListItem from '../../shared/components/FileListItem';
import type { TransferHistoryItem } from '../../shared/services/StorageService';
import { StorageService } from '../../shared/services/StorageService';
import { Formatters } from '../../shared/utils/formatters';

/**
 * Props for the HistoryModal component.
 */
interface HistoryModalProps {
  /**
   * Callback to close the modal.
   */
  onClose: () => void;
}

/**
 * A modal that displays logged transfer history (sent and received files).
 */
const HistoryModal: React.FC<HistoryModalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);

  useEffect(() => {
    setHistory(StorageService.loadHistory());
  }, []);

  const clearHistory = () => {
    StorageService.clearHistory();
    setHistory([]);
  };


  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Transfer History"
      icon={Clock}
      size="lg"
      headerContent={
        history.length > 0 && (
          <Button variant="danger" size="icon" onClick={clearHistory} title="Clear History">
            <Trash2 size={18} />
          </Button>
        )
      }
    >
      {history.length === 0 ? (
        <EmptyState icon={Clock} title="No transfer history yet" className="py-12" />
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <FileListItem
              key={item.id}
              filename={item.filename}
              status={item.status}
              size={item.size}
              icon={item.direction === 'sent' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              iconClassName={
                item.direction === 'sent'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'bg-purple-900/30 text-purple-400'
              }
              details={
                <>
                  <span>•</span>
                  <span>{item.protocol.toUpperCase()}</span>
                  <span>•</span>
                  <span>{Formatters.date(item.timestamp)}</span>
                </>
              }
            />
          ))}
        </div>
      )}
    </BaseModal>
  );
};

export default HistoryModal;
