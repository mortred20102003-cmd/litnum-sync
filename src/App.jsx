import { useEffect, useState } from 'react';
import { syncData } from './syncEngine';
import { db } from './db';
import { supabase } from './supabaseClient';
import { WifiOff, Save, CheckCircle, LayoutDashboard, RefreshCw, X, AlertTriangle, Printer, LogOut, BookOpen, Calculator, Mail, Lock, User, Eye, EyeOff, Users, UserPlus } from 'lucide-react';

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

  // Teacher States
  const [view, setView] = useState('teacher');
  const [learners, setLearners] = useState([]); // Real learners from DB
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('reading');
  const [formData, setFormData] = useState({
    phonics: '', fluency: '', comprehension: '', numberSense: '', cpaStage: '', nextStep: ''
  });

  // Register Learner Modal States
  const [isLearnerModalOpen, setIsLearnerModalOpen] = useState(false);
  const [newLearner, setNewLearner] = useState({ firstName: '', lastName: '', gradeLevel: 'Grade 1' });

  // Principal States
  const [cloudAssessments, setCloudAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [interventionText, setInterventionText] = useState('');

  // SuperAdmin States
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) {
      setUserRole(data.role);
      setView(data.role);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isLoginView) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, email: email, role: 'teacher' }]);
        }
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setSession(null);
  };

  useEffect(() => {
    if (session) {
      syncData();
      window.addEventListener('online', syncData);
    }
    return () => window.removeEventListener('online', syncData);
  }, [session]);

  useEffect(() => {
    if (view === 'teacher' && userRole === 'teacher') {
      fetchLearners();
    } else if (view === 'principal' && userRole === 'principal') {
      fetchCloudData();
    } else if (userRole === 'superAdmin') {
      fetchAllUsers();
      fetchCloudData();
    }
  }, [view, userRole]);

  const fetchLearners = async () => {
    const { data, error } = await supabase.from('learners').select('*').order('last_name', { ascending: true });
    if (!error) setLearners(data || []);
  };

  const handleAddLearner = async () => {
    if (!newLearner.firstName || !newLearner.lastName) return alert("Please enter a name");
    
    const { error } = await supabase.from('learners').insert([{
      first_name: newLearner.firstName,
      last_name: newLearner.lastName,
      grade_level: newLearner.gradeLevel,
      section: 'A',
      school_name: 'Sample School'
    }]);

    if (!error) {
      setIsLearnerModalOpen(false);
      setNewLearner({ firstName: '', lastName: '', gradeLevel: 'Grade 1' });
      fetchLearners(); // Refresh the list
    } else {
      alert("Error adding learner");
    }
  };

  const fetchCloudData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('assessments').select('*').order('created_at', { ascending: false });
    if (!error) setCloudAssessments(data || []);
    setIsLoading(false);
  };

  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error) setAllUsers(data || []);
    setIsLoadingUsers(false);
  };

  const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) fetchAllUsers();
  };

  const handleSaveOffline = async () => {
    try {
      const assessmentId = crypto.randomUUID();
      await db.assessments.add({
        id: assessmentId,
        learner_id: selectedLearner.id,
        reading_components: { phonics: formData.phonics, fluency: formData.fluency, comprehension: formData.comprehension },
        numeracy_components: { numberSense: formData.numberSense, cpaStage: formData.cpaStage },
        next_instructional_step: formData.nextStep,
        sync_status: 'pending'
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      setFormData({ phonics: '', fluency: '', comprehension: '', numberSense: '', cpaStage: '', nextStep: '' });
      setSelectedLearner(null);
    } catch (error) {
      console.error("Failed to save locally:", error);
    }
  };

  const saveIntervention = async () => {
    const { error } = await supabase.from('assessments').update({ intervention_plan: interventionText, intervention_status: 'In Progress' }).eq('id', activeAssessment.id);
    if (!error) { setIsModalOpen(false); fetchCloudData(); }
  };

  const getLearnerName = (id) => {
    const learner = learners.find(l => l.id === id);
    return learner ? `${learner.last_name}, ${learner.first_name}` : 'Unknown Learner';
  };

  const getStatusColor = (status) => {
    if (status === 'Needs Support') return 'bg-red-100 text-red-700';
    if (status === 'Developing') return 'bg-yellow-100 text-yellow-700';
    if (status === 'Proficient') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-500';
  };

  // LOGIN SCREEN
  if (!session || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome</h1>
            <p className="text-gray-500 text-sm mt-1">{isLoginView ? 'Login to continue' : 'Create an account'}</p>
          </div>
          {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="text-gray-400" size={18} /></div>
              <input type="email" placeholder="Email Address" className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="text-gray-400" size={18} /></div>
              <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" disabled={authLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex justify-center mt-2">
              {authLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Register')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }} className="text-sm text-gray-500 hover:text-blue-600 font-medium">
              {isLoginView ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800 relative">
      <header className="bg-blue-900 text-white p-4 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-center shadow-lg gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold">LPMT</h1>
          <p className="text-blue-200 text-sm capitalize">{userRole} Portal ({session.user.email})</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-800 px-3 py-2 rounded-lg text-sm">
            <WifiOff size={16} className="text-yellow-400" /><span className="hidden sm:inline">Offline Capable</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* TEACHER VIEW */}
        {view === 'teacher' && userRole === 'teacher' && (
          <div className="max-w-md mx-auto print:hidden">
            {!selectedLearner && (
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold">Class Roster</h2>
                  <button onClick={() => setIsLearnerModalOpen(true)} className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition">
                    <UserPlus size={16} /> Add Learner
                  </button>
                </div>
                <ul className="space-y-2">
                  {learners.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">No learners yet. Click "Add Learner" to start.</p>}
                  {learners.map(learner => (
                    <li key={learner.id}>
                      <button onClick={() => setSelectedLearner(learner)} className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 transition">
                        <span className="font-semibold">{learner.last_name}, {learner.first_name}</span>
                        <span className="block text-sm text-gray-500">{learner.grade_level}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedLearner && (
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold">Assessment</h2>
                  <button onClick={() => setSelectedLearner(null)} className="text-sm text-blue-600 hover:underline">Cancel</button>
                </div>
                <p className="mb-4 text-sm text-gray-600">Assessing: <strong>{selectedLearner.first_name} {selectedLearner.last_name}</strong></p>

                <div className="flex gap-2 mb-4">
                  <button onClick={() => setActiveTab('reading')} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 ${activeTab === 'reading' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500'}`}><BookOpen size={16} /> Reading</button>
                  <button onClick={() => setActiveTab('numeracy')} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 ${activeTab === 'numeracy' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500'}`}><Calculator size={16} /> Numeracy</button>
                </div>

                <div className="space-y-4">
                  {activeTab === 'reading' && (
                    <>
                      <div><label className="block text-sm font-medium mb-1">Phonics & Word Recognition</label><select className="w-full p-2 border rounded" value={formData.phonics} onChange={(e) => setFormData({...formData, phonics: e.target.value})}><option value="">Select</option><option value="Needs Support">Needs Support</option><option value="Developing">Developing</option><option value="Proficient">Proficient</option></select></div>
                      <div><label className="block text-sm font-medium mb-1">Fluency</label><select className="w-full p-2 border rounded" value={formData.fluency} onChange={(e) => setFormData({...formData, fluency: e.target.value})}><option value="">Select</option><option value="Needs Support">Needs Support</option><option value="Developing">Developing</option><option value="Proficient">Proficient</option></select></div>
                      <div><label className="block text-sm font-medium mb-1">Comprehension</label><select className="w-full p-2 border rounded" value={formData.comprehension} onChange={(e) => setFormData({...formData, comprehension: e.target.value})}><option value="">Select</option><option value="Needs Support">Needs Support</option><option value="Developing">Developing</option><option value="Proficient">Proficient</option></select></div>
                    </>
                  )}
                  {activeTab === 'numeracy' && (
                    <>
                      <div><label className="block text-sm font-medium mb-1">Number Sense</label><select className="w-full p-2 border rounded" value={formData.numberSense} onChange={(e) => setFormData({...formData, numberSense: e.target.value})}><option value="">Select</option><option value="Needs Support">Needs Support</option><option value="Developing">Developing</option><option value="Proficient">Proficient</option></select></div>
                      <div><label className="block text-sm font-medium mb-1">CPA Stage</label><select className="w-full p-2 border rounded" value={formData.cpaStage} onChange={(e) => setFormData({...formData, cpaStage: e.target.value})}><option value="">Select</option><option value="Concrete">Concrete</option><option value="Pictorial">Pictorial</option><option value="Abstract">Abstract</option></select></div>
                    </>
                  )}
                  <div className="pt-2 border-t mt-4"><label className="block text-sm font-medium mb-1">Next Instructional Step</label><textarea className="w-full p-2 border rounded h-20" value={formData.nextStep} onChange={(e) => setFormData({...formData, nextStep: e.target.value})}></textarea></div>
                  <button onClick={handleSaveOffline} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2">
                    {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}{isSaved ? 'Saved Offline!' : 'Save Assessment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRINCIPAL DASHBOARD */}
        {view === 'principal' && userRole === 'principal' && (
          <div className="bg-white rounded-xl shadow p-6 print:shadow-none print:p-0">
            <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold uppercase">Learner Progress Monitoring Tool (LPMT)</h1>
              <p className="text-lg">School Learner Progress & Intervention Report</p>
              <p className="text-sm text-gray-600 mt-2">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-2xl font-bold flex items-center gap-2"><LayoutDashboard size={24} /> School Head Dashboard</h2>
              <div className="flex gap-2">
                <button onClick={fetchCloudData} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm transition"><RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh</button>
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"><Printer size={16} /> PDF Report</button>
              </div>
            </div>
            <div className="overflow-x-auto border rounded-xl print:border-gray-400">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-50 text-gray-600 text-sm border-b print:bg-gray-200 print:text-black"><th className="p-4 font-semibold print:border print:border-gray-400">Learner Name</th><th className="p-4 font-semibold print:border print:border-gray-400">Phonics</th><th className="p-4 font-semibold print:border print:border-gray-400">Number Sense</th><th className="p-4 font-semibold print:border print:border-gray-400">Intervention</th></tr></thead>
                <tbody>
                  {cloudAssessments.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50 text-sm print:hover:bg-white">
                      <td className="p-4 font-semibold print:border print:border-gray-400">{getLearnerName(record.learner_id)}</td>
                      <td className="p-4 print:border print:border-gray-400"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.reading_components?.phonics)}`}>{record.reading_components?.phonics || 'N/A'}</span></td>
                      <td className="p-4 print:border print:border-gray-400"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.numeracy_components?.numberSense)}`}>{record.numeracy_components?.numberSense || 'N/A'}</span></td>
                      <td className="p-4 print:border print:border-gray-400">
                        {record.intervention_plan ? (
                          <div className="flex flex-col gap-1"><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-max print:bg-white print:text-black print:border">In Progress</span><span>{record.intervention_plan}</span></div>
                        ) : (
                          <button onClick={() => { setActiveAssessment(record); setInterventionText(''); setIsModalOpen(true); }} className="flex items-center gap-1 text-white bg-blue-600 px-3 py-1.5 rounded-lg text-xs print:hidden"><AlertTriangle size={14} /> Assign</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPER ADMIN DASHBOARD */}
        {userRole === 'superAdmin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-600"><p className="text-gray-500 text-sm font-semibold">Total Assessments</p><p className="text-3xl font-bold">{cloudAssessments.length}</p></div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-600"><p className="text-gray-500 text-sm font-semibold">Learners Needing Support</p><p className="text-3xl font-bold">{cloudAssessments.filter(a => a.reading_components?.phonics === 'Needs Support' || a.numeracy_components?.numberSense === 'Needs Support').length}</p></div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-600"><p className="text-gray-500 text-sm font-semibold">Total Registered Users</p><p className="text-3xl font-bold">{allUsers.length}</p></div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Users size={24} /> User Management</h2>
                <button onClick={() => { fetchAllUsers(); fetchCloudData(); }} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-sm"><RefreshCw size={16} /> Refresh</button>
              </div>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-gray-50 text-gray-600 text-sm border-b"><th className="p-4 font-semibold">Email</th><th className="p-4 font-semibold">Current Role</th><th className="p-4 font-semibold">Action</th></tr></thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-gray-50 text-sm">
                        <td className="p-4 font-medium">{u.email}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'principal' ? 'bg-purple-100 text-purple-700' : u.role === 'superAdmin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{u.role.toUpperCase()}</span></td>
                        <td className="p-4">
                          {u.role !== 'superAdmin' && (
                            <select className="p-2 border rounded-lg bg-white" value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}>
                              <option value="teacher">Teacher</option><option value="principal">Principal</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* REGISTER LEARNER MODAL */}
      {isLearnerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Register New Learner</h3>
              <button onClick={() => setIsLearnerModalOpen(false)} className="text-gray-500 hover:text-gray-800"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input type="text" className="w-full p-2 border rounded-lg" value={newLearner.firstName} onChange={(e) => setNewLearner({...newLearner, firstName: e.target.value})} placeholder="e.g., Juan" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input type="text" className="w-full p-2 border rounded-lg" value={newLearner.lastName} onChange={(e) => setNewLearner({...newLearner, lastName: e.target.value})} placeholder="e.g., Dela Cruz" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade Level</label>
                <select className="w-full p-2 border rounded-lg" value={newLearner.gradeLevel} onChange={(e) => setNewLearner({...newLearner, gradeLevel: e.target.value})}>
                  <option value="Grade 1">Grade 1</option><option value="Grade 2">Grade 2</option><option value="Grade 3">Grade 3</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsLearnerModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddLearner} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Save Learner</button>
            </div>
          </div>
        </div>
      )}

      {/* INTERVENTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Log Intervention</h3>
            <textarea className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Action plan..." value={interventionText} onChange={(e) => setInterventionText(e.target.value)}></textarea>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={saveIntervention} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}