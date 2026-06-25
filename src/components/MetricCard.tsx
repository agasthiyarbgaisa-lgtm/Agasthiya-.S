import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  isPositive?: boolean;
  color: string;
  bgColor: string;
  description: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  icon: Icon,
  change,
  isPositive = true,
  color,
  bgColor,
  description,
}) => {
  return (
    <div
      id={id}
      className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">
          {value}
        </h3>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
      {change && (
        <div className="flex items-center mt-3 pt-3 border-t border-slate-50">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {change}
          </span>
          <span className="text-xs text-slate-400 ml-2">vs. previous quarter</span>
        </div>
      )}
    </div>
  );
};
