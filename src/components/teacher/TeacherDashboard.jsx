import { useMemo, useState } from 'react';
import { Users, Search, Trash2, AlertCircle, TrendingUp, Minus, TrendingDown } from 'lucide-react';
import DashboardCard from '../DashboardCard';
import RiskBadge from '../RiskBadge';
import { riskFromAssessment } from '../../lib/riskEngine';

const statusColor = (status) => {
  if (status === 'Needs Support') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  if (status === 'Developing')    return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
  if (status === 'Proficient')    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
  return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
};

const isAssessmentDue = (latest) => {
  if (!latest?.created_at) return true;
  const days = (Date.now() - new Date(latest.created_at).getTime()) / 86_400_000;
  return days >= 30;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Never Assessed';
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to determine trend (Comparing latest to previous)
const getTrend = (current, previous) => {
  if (!previous) return null;
  const levels = { 'Needs Support': 0, 'Developing': 1, 'Proficient': 2 };
  if (levels[current] > levels[previous]) return 'up';
  if (levels[current] < levels[previous]) return 'down';
  return 'stable';
};

export default function TeacherDashboard({
  learners,
  cloudAssessments,
  offlineCount = 0,
  onSelectLearner,
  onDeleteLearner,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  // Group assessments by learner, sorted newest first
  const assessmentsByLearner = useMemo(() => {
    const map = {};
    cloudAssessments.forEach((a) => {
      if (!map[a.learner_id]) map[a.learner_id] = [];
      map[a.learner_id].push(a);
    });
    // Ensure they are sorted descending
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    });
    return map;
  }, [cloudAssessments]);

  const stats = useMemo(() => {
    let high = 0;
    let due = 0;
    const needsAction = [];

    learners.forEach((l) => {
      const history = assessmentsByLearner[l.id] || [];
      const latest = history[0];
      
      if (riskFromAssessment(latest) === 'HIGH') high += 1;
      
      const isDue = isAssessmentDue(latest);
      if (isDue) due += 1;

      // Populate Needs Action List
      if (!l.reading_baseline) {
        needsAction.push({ name: l.first_name, reason: 'Baseline Missing', learner: l });
      } else if (isDue) {
        needsAction.push({ name: l.first_name, reason: 'Assessment Due', learner: l });
      }
    });

    return { total: learners.length, high, due, offline: offlineCount, needsAction };
  }, [learners, assessmentsByLearner, offlineCount]);

  const filteredLearners = learners.filter((l) => {
    const q = `${l.first_name} ${l.last_name}`.toLowerCase();
    if (!q.includes(searchTerm.toLowerCase())) return false;

    const history = assessmentsByLearner[l.id] || [];
    const latest = history[0];
    
    if (filterMode === 'no_baseline') return !l.reading_baseline && !l.numeracy_baseline;
    if (filterMode === 'at_risk') return riskFromAssessment(latest) === 'HIGH';
    if (filterMode === 'due') return isAssessmentDue(latest);
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <DashboardCard title="Learners"       value={stats.total}   color="gray" />
        <DashboardCard title="High Risk"      value={stats.high}    color="red" />
        <DashboardCard title="Assessment Due" value={stats.due}     color="yellow" />
        <DashboardCard title="Pending Sync"   value={stats.offline} color="green" />
      </div>

      {/* Needs Action Today */}
      {stats.needsAction.length > 0 ? (
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-orange-800 dark:text-orange-400 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
            <AlertCircle size={14} /> Needs Action Today
          </h3>
          <div className="space-y-2">
            {stats.needsAction.slice(0, 3).map((action, i) => (
              <div key={i} 
                   onClick={() => onSelectLearner(action.learner)}
                   className="flex justify-between items-center text-sm cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 p-1.5 -mx-1.5 rounded-lg transition">
                <span className="font-bold text-gray-800 dark:text-gray-200">{action.name}</span>
                <span className="text-[10px] bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded text-orange-600 dark:text-orange-400 font-bold">
                  {action.reason}
                </span>
              </div>
            ))}
            {stats.needsAction.length > 3 && (
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold pt-1 text-center">
                + {stats.needsAction.length - 3} more
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-green-700 dark:text-green-400">✅ All caught up!</p>
          <p className="text-xs text-green-600/80 dark:text-green-500/80 mt-1">No pending baselines or overdue assessments.</p>
        </div>
      )}

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search learner..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all',         label: 'All' },
            { id: 'no_baseline', label: 'Missing Baseline' },
            { id: 'at_risk',     label: 'High Risk' },
            { id: 'due',         label: 'Assessment Due' },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilterMode(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                filterMode === f.id
                  ? f.id === 'at_risk' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Learner Cards */}
      <div className="space-y-3">
        {filteredLearners.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <Users size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-bold text-gray-500">No learners found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : filteredLearners.map((l) => {
          const history = assessmentsByLearner[l.id] || [];
          const latest = history[0];
          const previous = history[1]; // For trend comparison

          const readingStatus = latest?.reading_components?.fluency || 'No Data';
          const numStatus = latest?.numeracy_components?.mathReasoning || 'No Data';
          const risk = riskFromAssessment(latest);
          
          const readingTrend = getTrend(readingStatus, previous?.reading_components?.fluency);
          const numTrend = getTrend(numStatus, previous?.numeracy_components?.mathReasoning);

          return (
            <div key={l.id} onClick={() => onSelectLearner(l)}
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-400 cursor-pointer transition group">
              
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                    {l.first_name[0]}{l.last_name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-blue-600 transition">
                        {l.last_name}, {l.first_name}
                      </h3>
                      <RiskBadge level={risk} />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      {l.grade_level} • LRN: {l.lrn || 'N/A'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Last Assessment: <span className="font-semibold text-gray-500 dark:text-gray-300">{formatDate(latest?.created_at)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      if (onDeleteLearner) onDeleteLearner(l);
                    }}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition"
                    title="Remove Learner"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                {/* Reading Badge + Trend */}
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusColor(readingStatus)}`}>
                    Read: {readingStatus}
                  </span>
                  {readingTrend === 'up' && <TrendingUp size={14} className="text-green-500" title="Improving" />}
                  {readingTrend === 'down' && <TrendingDown size={14} className="text-red-500" title="Declining" />}
                  {readingTrend === 'stable' && <Minus size={14} className="text-gray-400" title="Stable" />}
                </div>

                {/* Numeracy Badge + Trend */}
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusColor(numStatus)}`}>
                    Num: {numStatus}
                  </span>
                  {numTrend === 'up' && <TrendingUp size={14} className="text-green-500" title="Improving" />}
                  {numTrend === 'down' && <TrendingDown size={14} className="text-red-500" title="Declining" />}
                  {numTrend === 'stable' && <Minus size={14} className="text-gray-400" title="Stable" />}
                </div>

                {!l.reading_baseline && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 ml-auto">
                    Baseline Missing
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}