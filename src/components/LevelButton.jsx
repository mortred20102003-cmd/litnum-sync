import React from 'react';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

export default function LevelButton({ label, active, onClick, type }) {
  const base = "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition border border-transparent ";
  let styles = "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 ";
  
  if (active) {
    if (type === 'ns') styles = "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    if (type === 'dv') styles = "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
    if (type === 'pf') styles = "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
  }

  const icons = {
    ns: <AlertTriangle size={12} />,
    dv: <RefreshCw size={12} />,
    pf: <CheckCircle size={12} />
  };

  return (
    <button onClick={onClick} className={base + styles}>
      {icons[type]}
      <span className="mt-0.5">{label}</span>
    </button>
  );
}