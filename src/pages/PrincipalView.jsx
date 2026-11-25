import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, AlertTriangle, RefreshCw, Printer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import { topProblemAreas } from '../lib/riskEngine';
import DashboardCard from '../components/DashboardCard';
import { ProfileModal, InterventionModal } from '../components/Modals';

// Make sure these files exist in src/assets/
import mbhteLogo from '../assets/mbhte-logo.png';
import tawiLogo from '../assets/tawi-tawi-logo.png';

export default function PrincipalView() {
  const { displayName, schoolName, gradeHandled, theme, setTheme, saveProfile } = useApp();

  const [learners, setLearners] = useState([]);
  const [cloudAssessments, setCloudAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState(displayName || '');
  const [tempSchool, setTempSchool] = useState(schoolName || '');
  const [tempGrade, setTempGrade] = useState(gradeHandled || '');

  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [interventionText, setInterventionText] = useState('');

  useEffect(() => { setTempDisplayName(displayName || ''); }, [displayName]);
  useEffect(() => { setTempSchool(schoolName || ''); }, [schoolName]);
  useEffect(() => { setTempGrade(gradeHandled || ''); }, [gradeHandled]);

  const fetchLearners = async () => {
    const { data } = await supabase.from('learners').select('*').order('last_name');
    if (data) setLearners(data);
  };

  const fetchCloudData = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCloudAssessments(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLearners();
    fetchCloudData();

    const onFocus = () => fetchCloudData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // --- Derived metrics (memoized) ---
  const kpis = useMemo(() => {
    const counts = { 'Needs Support': 0, 'Developing': 0, 'Proficient': 0 };
    cloudAssessments.forEach((a) => {
      const lvl = a.reading_components?.fluency;
      if (lvl && counts[lvl] !== undefined) counts[lvl] += 1;
    });
    return counts;
  }, [cloudAssessments]);

  const problemAreas = useMemo(() => topProblemAreas(cloudAssessments, 3), [cloudAssessments]);

  // First assessment per learner (already sorted desc by created_at)
  const latestByLearner = useMemo(() => {
    const map = {};
    cloudAssessments.forEach((a) => {
      if (!map[a.learner_id]) map[a.learner_id] = a;
    });
    return map;
  }, [cloudAssessments]);

  const atRiskCount = useMemo(() => {
    return learners.filter((l) => {
      const latest = latestByLearner[l.id];
      return latest && (
        latest.reading_components?.fluency === 'Needs Support' ||
        latest.numeracy_components?.mathReasoning === 'Needs Support'
      );
    }).length;
  }, [learners, latestByLearner]);

  const openInterventionFor = (learner) => {
    const latest = latestByLearner[learner.id];
    if (!latest) {
      window.alert('No assessment synced for this learner yet.');
      return;
    }
    setActiveAssessment({
      ...latest,
      _learnerName: `${learner.first_name} ${learner.last_name}`,
    });
    setInterventionText(latest.intervention_plan || '');
    setIsInterventionModalOpen(true);
  };

  const closeInterventionModal = () => {
    setIsInterventionModalOpen(false);
    setActiveAssessment(null);
    setInterventionText('');
  };

  const saveIntervention = async () => {
    if (!activeAssessment?.id) return;
    await supabase
      .from('assessments')
      .update({ intervention_plan: interventionText, intervention_status: 'In Progress' })
      .eq('id', activeAssessment.id);
    closeInterventionModal();
    fetchCloudData();
  };

  const saveProfileHandler = async () => {
    await saveProfile({
      display_name: tempDisplayName,
      school_name: tempSchool,
      grade_handled: tempGrade,
    });
    setIsProfileModalOpen(false);
    alert('Profile updated successfully!');
  };

  return (
    <div className="flex h-screen bg-[#EDF1F7] dark:bg-[#0A111D] transition-colors overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col print:hidden transition-colors">
        
        {/* HEADER WITH LOGOS */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-center items-center gap-2 mb-4">
            <img src={mbhteLogo} alt="MBHTE" className="h-10 w-10 object-contain" />
            <img src={tawiLogo} alt="Tawi-Tawi" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-sm font-extrabold text-blue-900 dark:text-white leading-tight text-center">
            Learner Progress<br />Monitoring Tool
          </h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center mt-1">
            Schools Division of Tawi-Tawi
          </p>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-sm transition">
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition">
            <Users size={18} /> Learners
            <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
              {learners.length}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition">
            <AlertTriangle size={18} /> Interventions
            <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">
              {atRiskCount}
            </span>
          </button>
        </nav>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={fetchCloudData}
              className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-1 transition"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg flex justify-center items-center gap-1 transition"
            >
              <Printer size={14} /> Export
            </button>
          </div>
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
              {displayName?.[0] || 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-gray-900 dark:text-white">{displayName}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">School Head</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 print:p-0">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Print header */}
          <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4 text-black">
            <h1 className="text-2xl font-bold uppercase">Learner Progress Monitoring Tool</h1>
            <p className="text-sm">Generated on: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="flex justify-between items-end print:hidden">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
                Learner Progress Summary
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Baseline vs Current Status Review
              </p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
            <DashboardCard title="Total Learners" value={learners.length}           color="gray" />
            <DashboardCard title="Needs Support"  value={kpis['Needs Support']}     color="red" />
            <DashboardCard title="Developing"     value={kpis['Developing']}        color="yellow" />
            <DashboardCard title="Proficient"     value={kpis['Proficient']}        color="green" />
          </div>

          {/* Top problem areas */}
          {problemAreas.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 print:hidden">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Top Problem Areas</h3>
              <ol className="space-y-2">
                {problemAreas.map((area, i) => (
                  <li key={area} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {area.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Data table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Form 5: Data Review</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Compare baseline with the latest synced assessments.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3 font-bold">Learner (LRN)</th>
                    <th className="px-5 py-3 font-bold">Baseline (R / N)</th>
                    <th className="px-5 py-3 font-bold">Fluency</th>
                    <th className="px-5 py-3 font-bold">Numeracy Reasoning</th>
                    <th className="px-5 py-3 font-bold">Intervention</th>
                    <th className="px-5 py-3 font-bold print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {learners.map((l) => {
                    const latest = latestByLearner[l.id];
                    const fluency = latest?.reading_components?.fluency || '—';
                    const numReasoning = latest?.numeracy_components?.mathReasoning || '—';
                    const hasIntervention = !!latest?.intervention_plan;

                    const colorFor = (v) =>
                      v === 'Needs Support' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : v === 'Developing'   ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : v === 'Proficient'   ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'text-gray-400';

                    return (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-5 py-3 font-bold text-gray-800 dark:text-gray-200">
                          {l.last_name}, {l.first_name}{' '}
                          <span className="text-gray-400 font-normal">({l.lrn || 'N/A'})</span>
                        </td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-xs">
                          {l.reading_baseline || '—'} / {l.numeracy_baseline || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] px-2 py-1 rounded font-bold ${colorFor(fluency)}`}>
                            {fluency}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] px-2 py-1 rounded font-bold ${colorFor(numReasoning)}`}>
                            {numReasoning}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {hasIntervention ? (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded font-bold">
                              Plan active
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 print:hidden">
                          <button
                            onClick={() => openInterventionFor(l)}
                            className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded font-bold whitespace-nowrap"
                          >
                            Log Intervention
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {learners.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-center text-gray-500">
                        No learners yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        tempDisplayName={tempDisplayName}
        setTempDisplayName={setTempDisplayName}
        tempSchool={tempSchool}
        setTempSchool={setTempSchool}
        tempGrade={tempGrade}
        setTempGrade={setTempGrade}
        theme={theme}
        setTheme={setTheme}
        onSave={saveProfileHandler}
      />

      <InterventionModal
        isOpen={isInterventionModalOpen}
        onClose={closeInterventionModal}
        interventionText={interventionText}
        setInterventionText={setInterventionText}
        onSave={saveIntervention}
        learnerName={activeAssessment?._learnerName}
      />
    </div>
  );
}