import { useEffect, useState } from 'react';
import { syncData } from './lib/syncEngine';
import { db } from './lib/db';
import { supabase } from './lib/supabaseClient';
import { WifiOff, Wifi, Save, CheckCircle, LayoutDashboard, RefreshCw, X, AlertTriangle, Printer, LogOut, BookOpen, Calculator, Mail, Lock, User, Eye, EyeOff, Users, UserPlus, Check } from 'lucide-react';

export default function App() {
  // Auth States
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Main States
  const [view, setView] = useState('teacher');
  const [learners, setLearners] = useState([]);
  const [cloudAssessments, setCloudAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Internet Connection State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
  
  // Teacher States
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [activeTab, setActiveTab] = useState('reading');
  const [isSaved, setIsSaved] = useState(false);
  const [checkpoint, setCheckpoint] = useState('Monthly');
  const [nextStep, setNextStep] = useState('');
  
  // Reading State (5 components)
  const [readingData, setReadingData] = useState({
    oralLanguage: 'Developing', phonics: 'Developing', vocabulary: 'Developing', fluency: 'Developing', comprehension: 'Developing'
  });
  
  // Numeracy State (CPA Stepper)
  const [numeracyData, setNumeracyData] = useState({
    competency: 'Subtracts 2-digit numbers with regrouping', cpaStage: 2 // 0=Concrete, 1=Pictorial, 2=Abstract, 3=Mastered
  });

  // Modals
  const [isLearnerModalOpen, setIsLearnerModalOpen] = useState(false);
  const [newLearner, setNewLearner] = useState({ firstName: '', lastName: '', gradeLevel: 'Grade 1' });
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [interventionText, setInterventionText] = useState('');

  // SuperAdmin States
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setUserRole(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) { setUserRole(data.role); setView(data.role); }
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

  useEffect(() => {
    if (session) { syncData(); window.addEventListener('online', syncData); }
    return () => window.removeEventListener('online', syncData);
  }, [session]);

  useEffect(() => {
    if (view === 'teacher' && userRole === 'teacher') fetchLearners();
    if (view === 'principal' && userRole === 'principal') fetchCloudData();
    if (userRole === 'superAdmin') { fetchAllUsers(); fetchCloudData(); }
  }, [view, userRole]);

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
    const { error } = await supabase.from('learners').insert([{
      first_name: newLearner.firstName, last_name: newLearner.lastName, grade_level: newLearner.gradeLevel
    }]);
    if (!error) { setIsLearnerModalOpen(false); setNewLearner({ firstName: '', lastName: '', gradeLevel: 'Grade 2' }); fetchLearners(); }
  };

  const handleSaveOffline = async () => {
    try {
      const assessmentId = crypto.randomUUID();
      await db.assessments.add({
        id: assessmentId,
        learner_id: selectedLearner.id,
        checkpoint: checkpoint,
        reading_components: readingData,
        numeracy_components: numeracyData,
        next_instructional_step: nextStep,
        sync_status: 'pending'
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      setSelectedLearner(null);
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

  // --- UI COMPONENTS ---
  const LevelButton = ({ label, icon, active, onClick, type }) => {
    const base = "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-bold transition border border-transparent ";
    let styles = "text-gray-500 hover:bg-gray-100 ";
    if (active) {
      if (type === 'ns') styles = "bg-red-100 text-red-700 border-red-300";
      if (type === 'dv') styles = "bg-yellow-100 text-yellow-700 border-yellow-300";
      if (type === 'pf') styles = "bg-green-100 text-green-700 border-green-300";
    }
    return <button onClick={onClick} className={base + styles}>{icon}<span className="mt-1">{label}</span></button>;
  };

  if (!session || !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><User className="text-blue-600" size={32} /></div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome</h1>
            <p className="text-gray-500 text-sm mt-1">{isLoginView ? 'Login to continue' : 'Create an account'}</p>
          </div>
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type="email" placeholder="Email" className="w-full pl-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="relative"><Lock className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" value={password} onChange={e => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <button type="submit" disabled={authLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">{authLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Register')}</button>
          </form>
          <div className="mt-6 text-center"><button onClick={() => setIsLoginView(!isLoginView)} className="text-sm text-gray-500 hover:text-blue-600">{isLoginView ? "Don't have an account? Sign up" : "Already have an account? Login"}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDF1F7] text-[#0F1B2D] font-sans pb-12">
            {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center print:hidden sticky top-0 z-10 shadow-sm">
        {/* Left Side: Title and Icon */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><LayoutDashboard size={20} /></div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-tight">Learners Progress Monitoring Tool</h1>
            <p className="text-xs text-gray-500 capitalize">{userRole} Portal</p>
          </div>
        </div>

        {/* Right Side: Badges and Logout */}
        <div className="flex items-center gap-3">
          {/* Dynamic Online/Offline Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline Mode'}
          </div>

          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-6 px-4">
        
        {/* ========================================== */}
        {/* TEACHER VIEW */}
        {/* ========================================== */}
        {view === 'teacher' && userRole === 'teacher' && (
          <div className="max-w-md mx-auto print:hidden">
            {!selectedLearner ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h2 className="font-bold text-gray-800">Class Roster</h2>
                  <button onClick={() => setIsLearnerModalOpen(true)} className="flex items-center gap-1 text-sm font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"><UserPlus size={16} /> Add Learner</button>
                </div>
                <ul className="divide-y divide-gray-100">
                  {learners.map(l => (
                    <li key={l.id}><button onClick={() => setSelectedLearner(l)} className="w-full text-left p-4 hover:bg-blue-50 transition flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{l.first_name[0]}{l.last_name[0]}</div>
                      <div><span className="font-bold block text-gray-900">{l.last_name}, {l.first_name}</span><span className="text-xs text-gray-500">{l.grade_level}</span></div>
                    </button></li>
                  ))}
                  {learners.length === 0 && <p className="p-6 text-center text-gray-500">No learners yet.</p>}
                </ul>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
                  <div><h2 className="font-bold text-lg">{selectedLearner.first_name} {selectedLearner.last_name}</h2><p className="text-blue-200 text-xs">{selectedLearner.grade_level}</p></div>
                  <button onClick={() => setSelectedLearner(null)} className="text-sm bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 font-semibold">Close</button>
                </div>

                <div className="p-4 space-y-6">
                  {/* Checkpoint Selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Checkpoint</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                      {['Baseline', 'Monthly', 'Endline'].map(cp => (
                        <button key={cp} onClick={() => setCheckpoint(cp)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${checkpoint === cp ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>{cp}</button>
                      ))}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('reading')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab === 'reading' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}><BookOpen size={16}/> Reading</button>
                    <button onClick={() => setActiveTab('numeracy')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab === 'numeracy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}><Calculator size={16}/> Numeracy</button>
                  </div>

                  {/* READING FORM */}
                  {activeTab === 'reading' && (
                    <div className="space-y-4">
                      {[
                        { k: 'oralLanguage', label: 'Oral Language', icon: <BookOpen size={14}/> },
                        { k: 'phonics', label: 'Phonics', icon: <BookOpen size={14}/> },
                        { k: 'vocabulary', label: 'Vocabulary', icon: <BookOpen size={14}/> },
                        { k: 'fluency', label: 'Fluency', icon: <BookOpen size={14}/> },
                        { k: 'comprehension', label: 'Comprehension', icon: <BookOpen size={14}/> }
                      ].map(item => (
                        <div key={item.k} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <p className="font-bold text-sm text-gray-800 mb-2">{item.label}</p>
                          <div className="flex gap-2">
                            <LevelButton label="Needs Support" type="ns" icon={<AlertTriangle size={14}/>} active={readingData[item.k] === 'Needs Support'} onClick={() => setReadingData({...readingData, [item.k]: 'Needs Support'})} />
                            <LevelButton label="Developing" type="dv" icon={<RefreshCw size={14}/>} active={readingData[item.k] === 'Developing'} onClick={() => setReadingData({...readingData, [item.k]: 'Developing'})} />
                            <LevelButton label="Proficient" type="pf" icon={<CheckCircle size={14}/>} active={readingData[item.k] === 'Proficient'} onClick={() => setReadingData({...readingData, [item.k]: 'Proficient'})} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* NUMERACY FORM (CPA Stepper) */}
                  {activeTab === 'numeracy' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Competency</label>
                        <select className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-semibold text-sm" value={numeracyData.competency} onChange={e => setNumeracyData({...numeracyData, competency: e.target.value})}>
                          <option>Subtracts 2-digit numbers with regrouping</option>
                          <option>Adds 2-digit numbers with regrouping</option>
                          <option>Skip-counts by 2s, 5s and 10s up to 100</option>
                        </select>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-4">CPA Progression</p>
                        <div className="flex justify-between items-center relative">
                          {/* Line behind stepper */}
                          <div className="absolute left-6 right-6 top-1/2 h-1 bg-gray-200 -z-10"></div>
                          
                          {[
                            { s: 1, label: 'Concrete', icon: '🧱' },
                            { s: 2, label: 'Pictorial', icon: '🎨' },
                            { s: 3, label: 'Abstract', icon: '🔢' }
                          ].map((stage) => (
                            <div key={stage.s} className="flex flex-col items-center gap-2 bg-white px-2">
                              <button 
                                onClick={() => setNumeracyData({...numeracyData, cpaStage: stage.s})}
                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl transition ${numeracyData.cpaStage >= stage.s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                              >
                                {numeracyData.cpaStage >= stage.s ? <Check size={24} /> : stage.icon}
                              </button>
                              <span className={`text-xs font-bold ${numeracyData.cpaStage >= stage.s ? 'text-blue-700' : 'text-gray-400'}`}>{stage.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Next Instructional Step</label>
                    <textarea className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm h-24" placeholder="e.g. Pair with reading buddy..." value={nextStep} onChange={e => setNextStep(e.target.value)}></textarea>
                  </div>

                  <button onClick={handleSaveOffline} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-md flex justify-center items-center gap-2 transition">
                    {isSaved ? <CheckCircle size={20}/> : <Save size={20}/>} {isSaved ? 'Saved Offline!' : 'Save Offline'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* PRINCIPAL DASHBOARD (Matching Mockup) */}
        {/* ========================================== */}
        {view === 'principal' && userRole === 'principal' && (
          <div className="flex flex-col lg:flex-row gap-6 print:block">
            {/* Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0 print:hidden">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center"><LayoutDashboard size={20}/></div>
                  <div><p className="font-bold text-sm leading-tight text-gray-900">Sampaguita ES</p><p className="text-xs text-gray-500">School Head Dashboard</p></div>
                </div>
                <nav className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm"><LayoutDashboard size={18}/> Dashboard</button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold text-sm"><Users size={18}/> Learners <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">150</span></button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold text-sm"><AlertTriangle size={18}/> Interventions <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">12</span></button>
                </nav>
                <div className="mt-8 border-t border-gray-100 pt-4 flex gap-2">
                  <button onClick={fetchCloudData} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-1"><RefreshCw size={14} className={isLoading ? "animate-spin" : ""}/> Refresh</button>
                  <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-1"><Printer size={14}/> Export</button>
                </div>
              </div>
            </aside>

            {/* Main Dashboard Content */}
            <div className="flex-1 space-y-6 print:w-full">
              
              {/* Print Header */}
              <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold uppercase">Learners Progress Monitoring Tool</h1>
                <p className="text-sm">Generated on: {new Date().toLocaleDateString()}</p>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Grade 2 Progress Dashboard</h2>
                <p className="text-sm text-gray-500">Monthly check · November 2026</p>
              </div>

              {/* Top Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-gray-500">Learners Registered</span><Users className="text-blue-500" size={20}/></div>
                  <p className="text-4xl font-extrabold text-gray-900">{learners.length || 150}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-gray-500">Competencies Mastered</span><CheckCircle className="text-green-500" size={20}/></div>
                  <p className="text-4xl font-extrabold text-gray-900">65%</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3"><div className="bg-green-500 h-1.5 rounded-full" style={{width: '65%'}}></div></div>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-red-700">Learners Needing Support</span><AlertTriangle className="text-red-500" size={20}/></div>
                  <p className="text-4xl font-extrabold text-red-700">12</p>
                </div>
              </div>

              {/* Progress Summary Table (Stacked Bars) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div><h3 className="font-bold text-gray-900">Progress Summary</h3><p className="text-xs text-gray-500">Reading and Numeracy proficiency breakdown</p></div>
                </div>
                <div className="overflow-x-auto p-5">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 rounded-l-lg">Component</th>
                        <th className="px-2 py-3 text-center">Needs Support</th>
                        <th className="px-2 py-3 text-center">Developing</th>
                        <th className="px-2 py-3 text-center">Proficient</th>
                        <th className="px-4 py-3 rounded-r-lg min-w-[200px]">% Proficient</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { name: 'Fluency', ns: 5, dv: 10, pf: 35 },
                        { name: 'Comprehension', ns: 9, dv: 16, pf: 25 },
                        { name: 'Number Sense', ns: 4, dv: 8, pf: 38 },
                      ].map((row, i) => {
                        const total = row.ns + row.dv + row.pf;
                        const pct = Math.round((row.pf / total) * 100);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-4 font-bold text-gray-800">{row.name}</td>
                            <td className="px-2 py-4 text-center text-red-600 font-bold">{row.ns}</td>
                            <td className="px-2 py-4 text-center text-yellow-600 font-bold">{row.dv}</td>
                            <td className="px-2 py-4 text-center text-green-600 font-bold">{row.pf}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2.5 rounded-full overflow-hidden flex bg-gray-100">
                                  <div className="bg-red-500 h-full" style={{width: `${(row.ns/total)*100}%`}}></div>
                                  <div className="bg-yellow-400 h-full" style={{width: `${(row.dv/total)*100}%`}}></div>
                                  <div className="bg-green-500 h-full" style={{width: `${(row.pf/total)*100}%`}}></div>
                                </div>
                                <span className="font-bold text-gray-700 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action & Follow-up Log */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div><h3 className="font-bold text-gray-900">Action & Follow-up Log</h3><p className="text-xs text-gray-500">Recent interventions logged by teachers</p></div>
                  <button onClick={() => { setActiveAssessment({id: 'dummy-id'}); setIsInterventionModalOpen(true); }} className="bg-blue-50 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-blue-100 print:hidden">Add Entry</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Learner</th>
                        <th className="px-4 py-3">Focus Area</th>
                        <th className="px-4 py-3">Intervention</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cloudAssessments.filter(a => a.intervention_plan).map((rec) => (
                        <tr key={rec.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{new Date(rec.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-bold text-gray-800">{getLearnerName(rec.learner_id)}</td>
                          <td className="px-4 py-3 text-gray-600">Reading/Numeracy</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{rec.intervention_plan}</td>
                          <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold flex w-max items-center gap-1"><RefreshCw size={12}/> In Progress</span></td>
                        </tr>
                      ))}
                      {cloudAssessments.filter(a => a.intervention_plan).length === 0 && (
                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No interventions logged yet. Go to the Teacher view to sync some data.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUPER ADMIN DASHBOARD */}
        {userRole === 'superAdmin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-extrabold mb-4">Division Supervisor Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><p className="text-sm font-bold text-blue-600">Total Assessments</p><p className="text-3xl font-extrabold text-blue-900">{cloudAssessments.length}</p></div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100"><p className="text-sm font-bold text-red-600">Needs Support</p><p className="text-3xl font-extrabold text-red-900">{cloudAssessments.filter(a => a.reading_components?.phonics === 'Needs Support').length}</p></div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100"><p className="text-sm font-bold text-green-600">Users</p><p className="text-3xl font-extrabold text-green-900">{allUsers.length}</p></div>
              </div>
              <h3 className="font-bold border-b pb-2 mb-4">User Management</h3>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers.map(u => <tr key={u.id}><td className="px-4 py-3 font-medium">{u.email}</td><td className="px-4 py-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold uppercase">{u.role}</span></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

           {/* MODALS */}
      {isLearnerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Register New Learner</h3>
            <div className="space-y-3">
              <input type="text" className="w-full p-3 border rounded-xl" placeholder="First Name" value={newLearner.firstName} onChange={e => setNewLearner({...newLearner, firstName: e.target.value})} />
              <input type="text" className="w-full p-3 border rounded-xl" placeholder="Last Name" value={newLearner.lastName} onChange={e => setNewLearner({...newLearner, lastName: e.target.value})} />
              
              {/* UPDATED GRADE DROPDOWN */}
              <select 
                className="w-full p-3 border rounded-xl" 
                value={newLearner.gradeLevel} 
                onChange={e => setNewLearner({...newLearner, gradeLevel: e.target.value})}
              >
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
              </select>
              
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsLearnerModalOpen(false)} className="px-4 py-2 font-bold text-gray-500">Cancel</button>
              <button onClick={handleAddLearner} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

      {isInterventionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Log Intervention</h3>
            <textarea className="w-full p-3 border rounded-xl h-32" placeholder="Action plan..." value={interventionText} onChange={e => setInterventionText(e.target.value)}></textarea>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setIsInterventionModalOpen(false)} className="px-4 py-2 font-bold text-gray-500">Cancel</button>
              <button onClick={saveIntervention} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}