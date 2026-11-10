import { useEffect, useState } from 'react';
import { syncData } from './lib/syncEngine';
import { db } from './lib/db';
import { supabase } from './lib/supabaseClient';
import { 
  WifiOff, Wifi, Save, CheckCircle, LayoutDashboard, RefreshCw, X, AlertTriangle, 
  Printer, LogOut, BookOpen, Calculator, Mail, Lock, User, Eye, EyeOff, Users, 
  UserPlus, Check, Moon, Sun, Settings, ClipboardList, ArrowRightLeft
} from 'lucide-react';

export default function App() {
  // Auth & Global States
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Navigation States
  const [view, setView] = useState('teacher'); // 'teacher', 'principal', 'superAdmin'
  const [teacherTab, setTeacherTab] = useState('learners'); // 'learners', 'assess', 'sync', 'profile'

  // Data States
  const [learners, setLearners] = useState([]);
  const [cloudAssessments, setCloudAssessments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Teacher Assessment States
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [activeSubject, setActiveSubject] = useState('reading'); // 'reading' or 'numeracy'
  const [isSaved, setIsSaved] = useState(false);
  const [checkpoint, setCheckpoint] = useState('Monthly');
  const [nextStep, setNextStep] = useState('');
  const [readingData, setReadingData] = useState({ oralLanguage: 'Developing', phonics: 'Developing', vocabulary: 'Developing', fluency: 'Developing', comprehension: 'Developing' });
  const [numeracyData, setNumeracyData] = useState({ competency: 'Subtracts 2-digit numbers with regrouping', cpaStage: 2 });

  // Modals
  const [isLearnerModalOpen, setIsLearnerModalOpen] = useState(false);
  const [newLearner, setNewLearner] = useState({ firstName: '', lastName: '', gradeLevel: 'Grade 1' });
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [interventionText, setInterventionText] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else { setUserRole(null); setDisplayName(''); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('role, display_name').eq('id', userId).single();
    if (data) {
      setUserRole(data.role);
      setView(data.role);
      setDisplayName(data.display_name || data.role);
      setTempDisplayName(data.display_name || '');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    try {
      if (isLoginView) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) await supabase.from('profiles').insert([{ id: data.user.id, email, role: 'teacher' }]);
      }
    } catch (error) { setAuthError(error.message); } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUserRole(null); setSession(null); };

  const saveProfile = async () => {
    await supabase.from('profiles').update({ display_name: tempDisplayName }).eq('id', session.user.id);
    setDisplayName(tempDisplayName);
    setIsProfileModalOpen(false);
  };

  useEffect(() => {
    if (session) { syncData(); window.addEventListener('online', syncData); }
    return () => window.removeEventListener('online', syncData);
  }, [session]);

  useEffect(() => {
    if (view === 'teacher' && userRole === 'teacher') fetchLearners();
    if (view === 'principal' && userRole === 'principal') fetchCloudData();
    if (userRole === 'superAdmin') { fetchAllUsers(); fetchCloudData(); }
  }, [view, userRole]);

  // --- API Calls ---
  const fetchLearners = async () => {
    const { data } = await supabase.from('learners').select('*').order('last_name');
    if (data) setLearners(data);
  };

  const fetchCloudData = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('assessments').select('*').order('created_at', { ascending: false });
    if (data) setCloudAssessments(data);
    setIsLoading(false);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setAllUsers(data);
  };

  const handleAddLearner = async () => {
    if (!newLearner.firstName || !newLearner.lastName) return alert("Enter name");
    const { error } = await supabase.from('learners').insert([{ first_name: newLearner.firstName, last_name: newLearner.lastName, grade_level: newLearner.gradeLevel }]);
    if (!error) { setIsLearnerModalOpen(false); setNewLearner({ firstName: '', lastName: '', gradeLevel: 'Grade 1' }); fetchLearners(); }
  };

  const handleSaveOffline = async () => {
    try {
      const assessmentId = crypto.randomUUID();
      await db.assessments.add({ 
        id: assessmentId, learner_id: selectedLearner.id, checkpoint, 
        reading_components: readingData, numeracy_components: numeracyData, 
        next_instructional_step: nextStep, sync_status: 'pending' 
      });
      setIsSaved(true);
      setTimeout(() => { setIsSaved(false); setTeacherTab('learners'); setSelectedLearner(null); }, 2000);
    } catch (error) { console.error(error); }
  };

  const saveIntervention = async () => {
    await supabase.from('assessments').update({ intervention_plan: interventionText, intervention_status: 'In Progress' }).eq('id', activeAssessment.id);
    setIsInterventionModalOpen(false); fetchCloudData();
  };

  const getLearnerName = (id) => {
    const l = learners.find(x => x.id === id);
    return l ? `${l.last_name}, ${l.first_name}` : 'Unknown Learner';
  };

  const LevelButton = ({ label, icon, active, onClick, type }) => {
    const base = "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition border border-transparent ";
    let styles = "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 ";
    if (active) {
      if (type === 'ns') styles = "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      if (type === 'dv') styles = "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
      if (type === 'pf') styles = "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    }
    return <button onClick={onClick} className={base + styles}>{icon}<span className="mt-1">{label}</span></button>;
  };

  // --- LOGIN SCREEN ---
  if (!session || !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#EDF1F7] dark:bg-[#0A111D]">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-blue-100 dark:bg-blue-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><User className="text-blue-600 dark:text-blue-400" size={32} /></div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{isLoginView ? 'Login to continue' : 'Create an account'}</p>
          </div>
          {authError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4 text-center">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type="email" placeholder="Email" className="w-full pl-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="relative"><Lock className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <button type="submit" disabled={authLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">{authLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Register')}</button>
          </form>
          <div className="mt-6 text-center"><button onClick={() => setIsLoginView(!isLoginView)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600">{isLoginView ? "Don't have an account? Sign up" : "Already have an account? Login"}</button></div>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="min-h-screen bg-[#EDF1F7] dark:bg-[#0A111D] text-[#0F1B2D] dark:text-[#E8EEF8] font-sans transition-colors">
      
      {/* ========================================================= */}
      {/* TEACHER MOBILE APP INTERFACE (Bottom Nav) */}
      {/* ========================================================= */}
      {view === 'teacher' && userRole === 'teacher' && (
        <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-20">
          
          {/* Top Mobile Header */}
          <header className="px-5 pt-6 pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-extrabold text-blue-900 dark:text-white leading-tight">LPMT</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Teacher Portal</p>
            </div>
            <div className="flex gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold ${isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </header>

          {/* Main Content Area based on Tab */}
          <main className="flex-1 px-4">
            
            {/* TAB: LEARNERS */}
            {teacherTab === 'learners' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                  <h2 className="font-bold text-gray-800 dark:text-white">Class Roster</h2>
                  <button onClick={() => setIsLearnerModalOpen(true)} className="flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"><UserPlus size={14} /> Add</button>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {learners.map(l => (
                    <li key={l.id}>
                      <button onClick={() => { setSelectedLearner(l); setTeacherTab('assess'); }} className="w-full text-left p-4 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm">{l.first_name[0]}{l.last_name[0]}</div>
                        <div><span className="font-bold block text-gray-900 dark:text-white text-sm">{l.last_name}, {l.first_name}</span><span className="text-[11px] text-gray-500 dark:text-gray-400">{l.grade_level}</span></div>
                      </button>
                    </li>
                  ))}
                  {learners.length === 0 && <p className="p-8 text-center text-gray-500 text-sm">No learners yet. Click Add.</p>}
                </ul>
              </div>
            )}

            {/* TAB: ASSESS */}
            {teacherTab === 'assess' && (
              <div className="animate-fade-in">
                {!selectedLearner ? (
                  <div className="text-center py-20">
                    <ClipboardList size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Select a learner from the Roster to begin assessing.</p>
                    <button onClick={() => setTeacherTab('learners')} className="mt-4 text-blue-600 font-bold text-sm">Go to Roster</button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-blue-900 text-white">
                      <div><h2 className="font-bold text-lg">{selectedLearner.first_name} {selectedLearner.last_name}</h2><p className="text-blue-200 text-[11px]">{selectedLearner.grade_level}</p></div>
                      <button onClick={() => { setSelectedLearner(null); setTeacherTab('learners'); }} className="text-xs bg-white/20 px-3 py-1.5 rounded-lg font-semibold">Close</button>
                    </div>
                    <div className="p-4 space-y-5">
                      
                      {/* Subject Tabs */}
                      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button onClick={() => setActiveSubject('reading')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${activeSubject === 'reading' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><BookOpen size={14}/> Reading</button>
                        <button onClick={() => setActiveSubject('numeracy')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${activeSubject === 'numeracy' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Calculator size={14}/> Numeracy</button>
                      </div>

                      {activeSubject === 'reading' ? (
                        <div className="space-y-3">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Checkpoint</p>
                           <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl gap-1 mb-3">
                              {['Baseline', 'Monthly', 'Endline'].map(cp => (
                                <button key={cp} onClick={() => setCheckpoint(cp)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${checkpoint === cp ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'}`}>{cp}</button>
                              ))}
                            </div>
                          {[
                            { k: 'oralLanguage', label: 'Oral Language' }, { k: 'phonics', label: 'Phonics' }, 
                            { k: 'vocabulary', label: 'Vocabulary' }, { k: 'fluency', label: 'Fluency' }, { k: 'comprehension', label: 'Comprehension' }
                          ].map(item => (
                            <div key={item.k} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                              <p className="font-bold text-xs text-gray-800 dark:text-gray-200 mb-2">{item.label}</p>
                              <div className="flex gap-1.5">
                                <LevelButton label="Needs" type="ns" icon={<AlertTriangle size={12}/>} active={readingData[item.k] === 'Needs Support'} onClick={() => setReadingData({...readingData, [item.k]: 'Needs Support'})} />
                                <LevelButton label="Developing" type="dv" icon={<RefreshCw size={12}/>} active={readingData[item.k] === 'Developing'} onClick={() => setReadingData({...readingData, [item.k]: 'Developing'})} />
                                <LevelButton label="Proficient" type="pf" icon={<CheckCircle size={12}/>} active={readingData[item.k] === 'Proficient'} onClick={() => setReadingData({...readingData, [item.k]: 'Proficient'})} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Competency</label>
                            <select className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 font-semibold text-xs text-gray-800 dark:text-gray-200" value={numeracyData.competency} onChange={e => setNumeracyData({...numeracyData, competency: e.target.value})}>
                              <option>Subtracts 2-digit numbers with regrouping</option>
                              <option>Adds 2-digit numbers with regrouping</option>
                            </select>
                          </div>
                          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-4">CPA Progression</p>
                            <div className="flex justify-between items-center relative">
                              <div className="absolute left-6 right-6 top-1/2 h-1 bg-gray-200 dark:bg-gray-600 -z-10"></div>
                              {[{ s: 1, label: 'Concrete', icon: '🧱' }, { s: 2, label: 'Pictorial', icon: '🎨' }, { s: 3, label: 'Abstract', icon: '🔢' }].map((stage) => (
                                <div key={stage.s} className="flex flex-col items-center gap-2 bg-white dark:bg-gray-700 px-2">
                                  <button onClick={() => setNumeracyData({...numeracyData, cpaStage: stage.s})} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg transition ${numeracyData.cpaStage >= stage.s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'}`}>
                                    {numeracyData.cpaStage >= stage.s ? <Check size={20} /> : stage.icon}
                                  </button>
                                  <span className={`text-[10px] font-bold ${numeracyData.cpaStage >= stage.s ? 'text-blue-700 dark:text-blue-400' : 'text-gray-400'}`}>{stage.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Next Step / Remarks</label>
                        <textarea className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-xs h-20 dark:text-white" placeholder="e.g. Pair with reading buddy..." value={nextStep} onChange={e => setNextStep(e.target.value)}></textarea>
                      </div>

                      <button onClick={handleSaveOffline} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-md flex justify-center items-center gap-2 transition">
                        {isSaved ? <CheckCircle size={18}/> : <Save size={18}/>} {isSaved ? 'Saved Offline!' : 'Save Assessment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SYNC */}
            {teacherTab === 'sync' && (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <RefreshCw size={32} className={`text-blue-600 dark:text-blue-400 ${!isOnline ? 'opacity-50' : ''}`} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isOnline ? 'All Synced!' : 'Waiting for Signal'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 px-8">
                  {isOnline ? 'Your offline assessments have been successfully uploaded to the cloud database.' : 'You are currently offline. Assessments will sync automatically once you get a Wi-Fi or Mobile Data signal.'}
                </p>
                <button onClick={() => syncData()} className="mt-6 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm">Force Sync Now</button>
              </div>
            )}

            {/* TAB: PROFILE */}
            {teacherTab === 'profile' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-fade-in">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-extrabold text-2xl uppercase">{displayName[0]}</div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{displayName}</h2>
                    <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Display Name</label>
                    <input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white" value={tempDisplayName} onChange={e => setTempDisplayName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <div className="flex gap-2">
                      <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition ${theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}><Sun size={16} /> Light</button>
                      <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition ${theme === 'dark' ? 'border-blue-600 bg-blue-900/30 text-blue-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}><Moon size={16} /> Dark</button>
                    </div>
                  </div>
                  <button onClick={saveProfile} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">Save Changes</button>
                  <button onClick={handleLogout} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl flex justify-center items-center gap-2"><LogOut size={16}/> Logout</button>
                </div>
              </div>
            )}

          </main>

          {/* BOTTOM NAVIGATION BAR (Mobile App Style) */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-3 pb-safe z-40 max-w-md mx-auto">
            <button onClick={() => setTeacherTab('learners')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${teacherTab === 'learners' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}><Users size={20} /> Learners</button>
            <button onClick={() => setTeacherTab('assess')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${teacherTab === 'assess' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}><ClipboardList size={20} /> Assess</button>
            <button onClick={() => setTeacherTab('sync')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${teacherTab === 'sync' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}><ArrowRightLeft size={20} /> Sync</button>
            <button onClick={() => setTeacherTab('profile')} className={`flex flex-col items-center gap-1 text-[10px] font-bold ${teacherTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}><User size={20} /> Profile</button>
          </nav>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRINCIPAL DESKTOP DASHBOARD (Sidebar Layout) */}
      {/* ========================================================= */}
      {view === 'principal' && userRole === 'principal' && (
        <div className="flex h-screen bg-[#EDF1F7] dark:bg-[#0A111D] transition-colors overflow-hidden">
          
          {/* Desktop Sidebar */}
          <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col print:hidden transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-600 p-2 rounded-lg text-white"><LayoutDashboard size={20} /></div>
                <h1 className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">Learners Progress<br/>Monitoring Tool</h1>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Sampaguita Elementary School</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-sm transition"><LayoutDashboard size={18}/> Dashboard</button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition"><Users size={18}/> Learners <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{learners.length || 150}</span></button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition"><AlertTriangle size={18}/> Interventions <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">12</span></button>
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex gap-2">
                <button onClick={fetchCloudData} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-1 transition"><RefreshCw size={14} className={isLoading ? "animate-spin" : ""}/> Refresh</button>
                <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-1 transition"><Printer size={14}/> Export</button>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition" onClick={() => setIsProfileModalOpen(true)}>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">{displayName[0]}</div>
                <div className="min-w-0"><p className="text-xs font-bold truncate text-gray-900 dark:text-white">{displayName}</p><p className="text-[10px] text-gray-500 dark:text-gray-400">School Head</p></div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-8 print:p-0">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Print Header */}
              <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4 text-black">
                <h1 className="text-2xl font-bold uppercase">Learners Progress Monitoring Tool</h1>
                <p className="text-sm">Generated on: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex justify-between items-end print:hidden">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Grade Progress Dashboard</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly check · November 2026</p>
                </div>
                <div className="flex gap-2">
                  <button className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2">Grade 2 <ChevronDown size={14}/></button>
                  <button className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2">Monthly <ChevronDown size={14}/></button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-gray-500 dark:text-gray-400">Learners Registered</span><Users className="text-blue-500" size={20}/></div>
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{learners.length || 150}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Grades 1 to 3 · 50 per grade</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-gray-500 dark:text-gray-400">Competencies Mastered</span><CheckCircle className="text-green-500" size={20}/></div>
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-white">65%</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-3"><div className="bg-green-500 h-1.5 rounded-full" style={{width: '65%'}}></div></div>
                  <p className="text-[11px] text-gray-400 mt-1">Up 4 points from October</p>
                </div>
                <div className="bg-[#FBE1DE] dark:bg-red-900/20 p-5 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-red-700 dark:text-red-400">Learners Needing Urgent Support</span><AlertTriangle className="text-red-500" size={20}/></div>
                  <p className="text-4xl font-extrabold text-red-700 dark:text-red-400">12</p>
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">Rated Needs Support in 3 or more components</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Progress Summary</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Fluency: 70% of Grade 2 proficient.</p>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><b className="w-2.5 h-2.5 rounded bg-red-500"></b> Needs Support</span>
                    <span className="flex items-center gap-1.5"><b className="w-2.5 h-2.5 rounded bg-yellow-400"></b> Developing</span>
                    <span className="flex items-center gap-1.5"><b className="w-2.5 h-2.5 rounded bg-green-500"></b> Proficient</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-5 py-3 font-bold text-gray-600 dark:text-gray-300">Component · Grade 2</th>
                        <th className="px-2 py-3 text-center text-red-600 dark:text-red-400">Needs Support</th>
                        <th className="px-2 py-3 text-center text-yellow-600 dark:text-yellow-400">Developing</th>
                        <th className="px-2 py-3 text-center text-green-600 dark:text-green-400">Proficient</th>
                        <th className="px-5 py-3 font-bold min-w-[200px]">% Proficient</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                        <td colSpan="5" className="px-5 py-2 text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Reading</td>
                      </tr>
                      {[
                        { name: 'Oral Language', ns: 3, dv: 9, pf: 38 },
                        { name: 'Phonics', ns: 5, dv: 11, pf: 34 },
                        { name: 'Fluency', ns: 5, dv: 10, pf: 35 },
                        { name: 'Comprehension', ns: 9, dv: 16, pf: 25 }
                      ].map((row, i) => {
                        const total = row.ns + row.dv + row.pf;
                        const pct = Math.round((row.pf / total) * 100);
                        return (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-5 py-3 font-bold text-gray-800 dark:text-gray-200">{row.name}</td>
                            <td className="px-2 py-3 text-center font-bold text-gray-700 dark:text-gray-300">{row.ns}</td>
                            <td className="px-2 py-3 text-center font-bold text-gray-700 dark:text-gray-300">{row.dv}</td>
                            <td className="px-2 py-3 text-center font-bold text-gray-700 dark:text-gray-300">{row.pf}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700">
                                  <div className="bg-red-500 h-full" style={{width: `${(row.ns/total)*100}%`}}></div>
                                  <div className="bg-yellow-400 h-full" style={{width: `${(row.dv/total)*100}%`}}></div>
                                  <div className="bg-green-500 h-full" style={{width: `${(row.pf/total)*100}%`}}></div>
                                </div>
                                <span className="font-extrabold text-gray-700 dark:text-gray-300 w-8 text-right text-xs">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </main>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUPER ADMIN DASHBOARD (Simple Layout) */}
      {/* ========================================================= */}
      {userRole === 'superAdmin' && (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Division Supervisor Dashboard</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold"><LogOut size={16} /> Logout</button>
          </header>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-extrabold mb-4 text-gray-900 dark:text-white">User Management</h2>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {allUsers.map(u => <tr key={u.id}><td className="px-4 py-3 font-medium dark:text-gray-200">{u.email}</td><td className="px-4 py-3"><span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold uppercase dark:text-gray-300">{u.role}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS (Shared across views) */}
      {isLearnerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Register New Learner</h3>
            <div className="space-y-3">
              <input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="First Name" value={newLearner.firstName} onChange={e => setNewLearner({...newLearner, firstName: e.target.value})} />
              <input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Last Name" value={newLearner.lastName} onChange={e => setNewLearner({...newLearner, lastName: e.target.value})} />
              <select className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" value={newLearner.gradeLevel} onChange={e => setNewLearner({...newLearner, gradeLevel: e.target.value})}>
                <option value="Grade 1">Grade 1</option><option value="Grade 2">Grade 2</option><option value="Grade 3">Grade 3</option><option value="Grade 4">Grade 4</option><option value="Grade 5">Grade 5</option><option value="Grade 6">Grade 6</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsLearnerModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 dark:text-gray-400">Cancel</button>
              <button onClick={handleAddLearner} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
      
      {isInterventionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Log Intervention</h3>
            <textarea className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white h-32" placeholder="Action plan..." value={interventionText} onChange={e => setInterventionText(e.target.value)}></textarea>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setIsInterventionModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 dark:text-gray-400">Cancel</button>
              <button onClick={saveIntervention} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal for Principal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Profile Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                <input type="text" className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="e.g. Principal R. Jalani" value={tempDisplayName} onChange={e => setTempDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                <div className="flex gap-2">
                  <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition ${theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                    <Sun size={18} /> Light
                  </button>
                  <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition ${theme === 'dark' ? 'border-blue-600 bg-blue-900/30 text-blue-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                    <Moon size={18} /> Dark
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={saveProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}