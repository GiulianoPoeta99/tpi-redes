import { ArrowDown, ArrowUp, Clock, FileText, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { StorageService, type TransferHistoryItem } from '../services/StorageService';

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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-700 m-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-400" size={20} />
            <h2 className="text-lg font-bold text-white">Transfer History</h2>
          </div>
          <div className="flex gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Clear History"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="mx-auto mb-3 opacity-20" size={48} />
              <p>No transfer history yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: ID is usually timestamp based
                <div
                  key={item.id}
                  className="bg-gray-800/50 border border-gray-700 p-3 rounded-lg flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        item.direction === 'sent'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-purple-900/30 text-purple-400'
                      }`}
                    >
                      {item.direction === 'sent' ? (
                        <ArrowUp size={16} />
                      ) : (
                        <ArrowDown size={16} />
                      )}
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
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
