import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SensorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  statusColor: 'blue' | 'red' | 'green' | 'gray' | 'orange';
  subtext: string;
  isLoading?: boolean;
}

const SensorCard: React.FC<SensorCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  statusColor, 
  subtext,
  isLoading = false
}) => {
  
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    gray: 'bg-gray-50 border-gray-100 text-gray-700',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    red: 'text-red-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    gray: 'text-gray-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${colorClasses[statusColor]} p-6 shadow-sm transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80 uppercase tracking-wide">{title}</p>
          <div className="mt-2 flex items-baseline">
            {isLoading ? (
               <div className="h-10 w-24 animate-pulse rounded bg-gray-200/50"></div>
            ) : (
              <>
                <span className="text-4xl font-bold tracking-tight">{value}</span>
                {unit && <span className="ml-1 text-xl font-medium opacity-70">{unit}</span>}
              </>
            )}
          </div>
        </div>
        <div className={`rounded-full p-3 bg-white/60 shadow-sm ${iconColorClasses[statusColor]}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-4 text-xs font-medium opacity-80">
        {isLoading ? 'Updating...' : subtext}
      </div>
    </div>
  );
};

export default SensorCard;