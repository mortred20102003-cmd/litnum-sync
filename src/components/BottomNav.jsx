import React from 'react';
import { Users, ClipboardList, ArrowRightLeft, User } from 'lucide-react';

export default function BottomNav({ activeTab, setTab }) {
  const tabs = [
    { id: 'learners', label: 'Roster', icon: <Users size={20} /> },
    { id: 'assess', label: 'Assess', icon: <ClipboardList size={20} /> },
    { id: 'sync', label: 'Sync', icon: <ArrowRightLeft size={20} /> },
    { id: 'profile', label: 'Profile', icon: <User size={20} /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-3 pb-safe z-40 max-w-md mx-auto">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => setTab(tab.id)} 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </nav>
  );
}