import { useEffect, useState } from 'react';
import { Wifi, WifiOff, UserPlus, ClipboardList } from 'lucide-react';
import { syncData } from '../lib/syncEngine';
import { supabase } from '../lib/supabaseClient';
import { db } from '../lib/db';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { LearnerModal } from '../components/Modals';
import TeacherDashboard from '../components/teacher/TeacherDashboard';
import AssessmentHub from '../components/teacher/AssessmentHub'; // <-- NEW IMPORT
import AssessmentForm from '../components/teacher/AssessmentForm';
import SyncTab from '../components/teacher/SyncTab';
import TeacherProfile from '../components/teacher/TeacherProfile';
import LearnerProfile from '../components/teacher/LearnerProfile';

const emptyLearner = {
  firstName: '', lastName: '', gradeLevel: 'Grade 1', lrn: '',
  readingBaseline: '', numeracyBaseline: '', priorityNeed: '',
};

export default function TeacherView() {
  const { session, isOnline } = useApp();

  const [teacherTab, setTeacherTab] = useState('learners'); 
  const [learners, setLearners] = useState([]);
  const [cloudAssessments, setCloudAssessments] = useState([]);
  const [offlineAssessments, setOfflineAssessments] = useState([]);
  
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [isLearnerModalOpen, setIsLearnerModalOpen] = useState(false);
  const [newLearner, setNewLearner] = useState(emptyLearner);

  // ... (Keep all your existing fetch functions and useEffect hooks exactly the same) ...
  const fetchLearners = async () => {
    const { data } = await supabase.from('learners').select('*').order('last_name');
    if (data) setLearners(data);
  };

  const fetchCloudData = async () => {
    const { data } = await supabase.from('assessments').select('*').order('created_at', { ascending: false });
    if (data) setCloudAssessments(data);
  };

  const fetchOfflineData = async () => {
    try {
      const rows = await db.assessments.toArray();
      setOfflineAssessments(rows);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchLearners();
    fetchCloudData();
    fetchOfflineData();
    const onFocus = () => { fetchCloudData(); fetchOfflineData(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (session) {
      syncData();
      window.addEventListener('online', syncData);
    }
    return () => window.removeEventListener('online', syncData);
  }, [session]);

  const allAssessments = [
    ...offlineAssessments.map(a => ({ ...a, _offline: true, created_at: a.created_at || new Date().toISOString() })),
    ...cloudAssessments,
  ];

  const closeLearnerModal = () => {
    setIsLearnerModalOpen(false);
    setNewLearner(emptyLearner);
  };

  const handleAddLearner = async () => {
    if (!newLearner.firstName.trim() || !newLearner.lastName.trim()) return;
    const { error } = await supabase.from('learners').insert([{
      first_name: newLearner.firstName, last_name: newLearner.lastName,
      grade_level: newLearner.gradeLevel, lrn: newLearner.lrn,
      reading_baseline: newLearner.readingBaseline, numeracy_baseline: newLearner.numeracyBaseline,
      priority_need: newLearner.priorityNeed,
    }]);
    if (!error) { closeLearnerModal(); fetchLearners(); } else { alert('Error adding learner.'); }
  };

  const handleDeleteLearner = async (learner) => {
    if (!window.confirm(`Remove ${learner.first_name} ${learner.last_name}?`)) return;
    const { error } = await supabase.from('learners').delete().eq('id', learner.id);
    if (!error) fetchLearners();
  };

  const handleAssessmentSaved = () => {
    fetchCloudData();
    fetchOfflineData();
    setTeacherTab('learner-profile'); 
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-20 bg-[#EDF1F7] dark:bg-[#0A111D] text-[#0F1B2D] dark:text-[#E8EEF8] font-sans transition-colors">
      
      {teacherTab !== 'learner-profile' && (
        <header className="px-5 pt-6 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-blue-900 dark:text-white leading-tight">LPMT</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Teacher Portal</p>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold ${
            isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-600'
          }`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </header>
      )}

      <main className="flex-1 px-4">
        
        {/* ROSTER DASHBOARD */}
        {teacherTab === 'learners' && (
          <TeacherDashboard
            learners={learners}
            cloudAssessments={allAssessments}
            offlineCount={offlineAssessments.filter(a => a.sync_status === 'pending').length}
            onSelectLearner={(l) => { setSelectedLearner(l); setTeacherTab('learner-profile'); }}
            onDeleteLearner={handleDeleteLearner}
          />
        )}

        {/* NEW ASSESSMENT HUB */}
        {teacherTab === 'assess' && (
          <AssessmentHub
            learners={learners}
            cloudAssessments={allAssessments}
            onSelectLearner={(l) => { 
              setSelectedLearner(l); 
              // If they click from the Hub, send them straight to the form
              setTeacherTab('assess-form'); 
            }}
          />
        )}

        {/* ASSESSMENT FORM (Renamed tab ID to 'assess-form') */}
        {teacherTab === 'assess-form' && (
          <div className="animate-fade-in">
            {!selectedLearner ? (
              <div className="text-center py-20">
                <ClipboardList size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Select a learner first.</p>
                <button onClick={() => setTeacherTab('assess')} className="mt-4 text-blue-600 font-bold text-sm">Go to Hub</button>
              </div>
            ) : (
              <AssessmentForm
                learner={selectedLearner}
                cloudAssessments={cloudAssessments}
                onClose={() => setTeacherTab('assess')}
                onSaved={handleAssessmentSaved}
              />
            )}
          </div>
        )}

        {/* LEARNER PROFILE */}
        {teacherTab === 'learner-profile' && selectedLearner && (
          <LearnerProfile
            learner={selectedLearner}
            allAssessments={allAssessments}
            onBack={() => { setSelectedLearner(null); setTeacherTab('learners'); }}
            onAssess={() => setTeacherTab('assess-form')}
          />
        )}

        {teacherTab === 'sync' && <SyncTab isOnline={isOnline} />}
        {teacherTab === 'profile' && (
        <TeacherProfile 
        learners={learners} 
        cloudAssessments={allAssessments} 
            />
        )}
      </main>

      {teacherTab === 'learners' && (
        <button
          onClick={() => setIsLearnerModalOpen(true)}
          title="Add Learner"
          className="group fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all z-40"
        >
          <UserPlus size={24} />
        </button>
      )}

      <BottomNav activeTab={teacherTab === 'assess-form' || teacherTab === 'learner-profile' ? 'learners' : teacherTab} setTab={setTeacherTab} />

      <LearnerModal
        isOpen={isLearnerModalOpen}
        onClose={closeLearnerModal}
        newLearner={newLearner}
        setNewLearner={setNewLearner}
        onSave={handleAddLearner}
      />
    </div>
  );
}