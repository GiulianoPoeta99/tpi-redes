import type React from 'react';

/**
 * Props for the KpiCard component.
 */
interface KpiCardProps {
  /**
   * Icon element to display.
   */
  icon: React.ReactNode;
  /**
   * Label text for the KPI.
   */
  label: string;
  /**
   * Value to display.
   */
  value: string | number;
  /**
   * Class for the text color of the icon.
   */
  color: string;
  /**
   * Class for the background color of the icon.
   */
  bg: string;
}

/**
 * A small card component for displaying Key Performance Indicators (KPIs).
 */
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
