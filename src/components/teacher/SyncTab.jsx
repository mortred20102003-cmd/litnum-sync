import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { syncData } from '../../lib/syncEngine';
import { db } from '../../lib/db';

export default function SyncTab({ isOnline }) {
  const [pending, setPending] = useState(0);
  const [synced, setSynced] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [busy, setBusy] = useState(false);

  const refreshCounts = async () => {
    const all = await db.assessments.toArray();
    setPending(all.filter((r) => r.sync_status === 'pending').length);
    setSynced(all.filter((r) => r.sync_status === 'synced').length);
    const stored = localStorage.getItem('lastSyncAt');
    if (stored) setLastSync(new Date(stored));
  };

  useEffect(() => { refreshCounts(); }, []);

  const forceSync = async () => {
    setBusy(true);
    try {
      await syncData();
      localStorage.setItem('lastSyncAt', new Date().toISOString());
      await refreshCounts();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-center py-12 animate-fade-in">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <RefreshCw size={32} className={`text-blue-600 dark:text-blue-400 ${!isOnline || busy ? 'animate-spin opacity-70' : ''}`} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {isOnline ? (pending === 0 ? 'All Synced!' : `${pending} to sync`) : 'Waiting for Signal'}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 px-8 mb-6">
        {isOnline
          ? pending === 0
            ? 'Your offline assessments have been uploaded to the cloud.'
            : 'Tap Force Sync to upload pending assessments.'
          : 'You are offline. Assessments will sync automatically once you reconnect.'}
      </p>

      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xl font-extrabold text-yellow-600 dark:text-yellow-400">{pending}</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Pending</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xl font-extrabold text-green-600 dark:text-green-400">{synced}</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Synced</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-extrabold text-gray-700 dark:text-gray-300 leading-tight">
            {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Last Sync</p>
        </div>
      </div>

      <button onClick={forceSync} disabled={!isOnline || busy}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-40">
        {busy ? 'Syncing...' : 'Force Sync Now'}
      </button>
    </div>
  );
}