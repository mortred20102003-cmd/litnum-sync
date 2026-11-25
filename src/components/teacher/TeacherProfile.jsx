import { useEffect, useState } from 'react';
import { Sun, Moon, LogOut, CheckCircle, Info, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TeacherProfile({ learners = [], cloudAssessments = [] }) {
  const {
    session,
    displayName, schoolName, gradeHandled,
    theme, setTheme, saveProfile, handleLogout,
    isOnline, // <-- Pull real-time network status
  } = useApp();

  const [tempName, setTempName] = useState(displayName || '');
  const [tempSchool, setTempSchool] = useState(schoolName || '');
  const [tempGrade, setTempGrade] = useState(gradeHandled || '');
  
  const [showToast, setShowToast] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => { setTempName(displayName || ''); }, [displayName]);
  useEffect(() => { setTempSchool(schoolName || ''); }, [schoolName]);
  useEffect(() => { setTempGrade(gradeHandled || ''); }, [gradeHandled]);

  useEffect(() => {
    const stored = localStorage.getItem('lastSyncAt');
    if (stored) setLastSync(new Date(stored));
  }, []);

  const getInitials = (name) => {
    if (!name) return 'T';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const totalLearners = learners.length;
  const highRiskCount = learners.filter(l => {
    const latest = cloudAssessments.find(a => a.learner_id === l.id);
    return latest && (
      latest.reading_components?.fluency === 'Needs Support' ||
      latest.numeracy_components?.mathReasoning === 'Needs Support'
    );
  }).length;
  const pendingCount = learners.filter(l => {
    const latest = cloudAssessments.find(a => a.learner_id === l.id);
    if (!latest?.created_at) return true;
    const days = (Date.now() - new Date(latest.created_at).getTime()) / 86_400_000;
    return days >= 30;
  }).length;

  const onSave = async () => {
    await saveProfile({
      display_name: tempName,
      school_name: tempSchool,
      grade_handled: tempGrade,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="animate-fade-in relative pb-10">
      
      {/* Custom Success Toast */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <CheckCircle size={16} /> Profile Updated
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl uppercase shadow-inner">
            {getInitials(displayName)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{displayName}</h2>
            <p className="text-xs text-gray-500 capitalize">{gradeHandled || 'Teacher'}</p>
          </div>
        </div>

        {/* Class Statistics */}
        <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">My Class Overview</h3>
          <div className="flex justify-between items-center divide-x divide-gray-200 dark:divide-gray-600 text-center">
            <div className="flex-1">
              <p className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">{totalLearners}</p>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Learners</p>
            </div>
            <div className="flex-1">
              <p className="text-xl font-extrabold text-red-600 dark:text-red-400 leading-none">{highRiskCount}</p>
              <p className="text-[10px] text-gray-500 font-bold mt-1">High Risk</p>
            </div>
            <div className="flex-1">
              <p className="text-xl font-extrabold text-yellow-600 dark:text-yellow-400 leading-none">{pendingCount}</p>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Due</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
            <input type="email" disabled
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              value={session?.user?.email || 'Not logged in'} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Display Name</label>
            <input type="text"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={tempName} onChange={e => setTempName(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">School Name</label>
            <input type="text"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Sampaguita Elementary School"
              value={tempSchool} onChange={e => setTempSchool(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Grade Level Handled</label>
            <select
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={tempGrade} onChange={e => setTempGrade(e.target.value)}>
              <option value="">Select Grade</option>
              <option>Grade 1</option><option>Grade 2</option><option>Grade 3</option>
              <option>Grade 4</option><option>Grade 5</option><option>Grade 6</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Theme</label>
            <div className="flex gap-2">
              <button onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition ${
                  theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                }`}><Sun size={16}/> Light</button>
              <button onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition ${
                  theme === 'dark' ? 'border-blue-600 bg-blue-900/30 text-blue-400' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                }`}><Moon size={16}/> Dark</button>
            </div>
          </div>

          <button onClick={onSave}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4 shadow-sm hover:bg-blue-700 transition">Save Changes</button>
        </div>

        {/* App Information */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Info size={12} /> App Information
          </h3>
          <div className="text-xs text-gray-500 space-y-1.5">
            <p className="flex justify-between"><span>LPMT Version</span> <span className="font-mono">1.0.0</span></p>
            
            {/* Real-time Connection Status */}
            <p className="flex justify-between items-center">
              <span>Network Status</span> 
              <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
            
            <p className="flex justify-between"><span>Data Mode</span> <span className="text-blue-600 dark:text-blue-400 font-bold">Offline-First</span></p>
            <p className="flex justify-between"><span>Last Sync</span> <span className="font-medium text-gray-700 dark:text-gray-300">{lastSync ? lastSync.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}</span></p>
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleLogout}
            className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition">
            <LogOut size={16}/> Logout
          </button>
        </div>
      </div>
    </div>
  );
}