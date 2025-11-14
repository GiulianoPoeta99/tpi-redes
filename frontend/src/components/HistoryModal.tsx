import { ArrowDown, ArrowUp, Clock, FileText, Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { StorageService, type TransferHistoryItem } from '../services/StorageService';
import BaseModal from './common/BaseModal';

interface HistoryModalProps {
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);

  useEffect(() => {
    setHistory(StorageService.loadHistory());
  }, []);

  const clearHistory = () => {
    StorageService.clearHistory();
    setHistory([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
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
          <button
            type="button"
            onClick={clearHistory}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Clear History"
          >
            <Trash2 size={18} />
          </button>
        )
      }
    >
      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="mx-auto mb-3 opacity-20" size={48} />
          <p>No transfer history yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    item.direction === 'sent'
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-purple-900/30 text-purple-400'
                  }`}
                >
                  {item.direction === 'sent' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{item.filename}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        item.status === 'success'
                          ? 'bg-green-900/30 text-green-400 border border-green-700/30'
                          : item.status === 'cancelled'
                            ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'
                            : 'bg-red-900/30 text-red-400 border border-red-700/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <FileText size={10} />
                    <span>{formatSize(item.size)}</span>
                    <span>•</span>
                    <span>{item.protocol.toUpperCase()}</span>
                    <span>•</span>
                    <span>{formatDate(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseModal>
  );
};

export default HistoryModal;
