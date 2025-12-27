import type React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, color, bg }) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-colors">
      <div className={`p-1.5 rounded-lg ${bg} ${color} mb-1`}>{icon}</div>
      <div className="text-xl font-bold text-white mb-0">{value}</div>
      <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
};

export default KpiCard;
