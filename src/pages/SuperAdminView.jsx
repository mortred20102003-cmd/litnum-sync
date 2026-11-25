import { useEffect, useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';

export default function SuperAdminView() {
  const { handleLogout } = useApp();
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('role');
    if (data) setAllUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  return (
    <div className="min-h-screen bg-[#EDF1F7] dark:bg-[#0A111D] transition-colors">
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Division Supervisor Dashboard
          </h1>
          <div className="flex gap-2">
            <button
              onClick={fetchAllUsers}
              className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-sm font-bold"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-sm font-bold"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-xl font-extrabold mb-4 text-gray-900 dark:text-white">
            User Management
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Display Name</th>
                  <th className="px-4 py-3">School</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium dark:text-gray-200">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold uppercase dark:text-gray-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {u.display_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {u.school_name || '—'}
                    </td>
                  </tr>
                ))}
                {allUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                      {isLoading ? 'Loading...' : 'No users found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}