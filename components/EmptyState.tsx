import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100 mt-4">
    <div className="bg-slate-50 p-4 rounded-full mb-4">
      <Icon className="text-slate-300" size={48} />
    </div>
    <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm mb-6 max-w-xs">{description}</p>
    {action}
  </div>
);

export default EmptyState;
