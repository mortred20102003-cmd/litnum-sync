import { useMemo } from 'react';
import { ClipboardList, AlertTriangle, Clock, CheckCircle, ChevronRight, User } from 'lucide-react';
import RiskBadge from '../RiskBadge';
import { riskFromAssessment } from '../../lib/riskEngine';

export default function AssessmentHub({ learners, cloudAssessments, onSelectLearner }) {
  const getLatest = (id) => cloudAssessments.find(a => a.learner_id === id);

  const isDue = (latest) => {
    if (!latest?.created_at) return true;
    const days = (Date.now() - new Date(latest.created_at).getTime()) / 86_400_000;
    return days >= 30;
  };

  const { priorityList, recentActivity, stats } = useMemo(() => {
    let assessedThisMonth = 0;
    let pendingCount = 0;
    const now = new Date();

    const recent = [...cloudAssessments].sort((a, b) => 
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    ).slice(0, 3);

    const priorities = learners.map(l => {
      const latest = getLatest(l.id);
      const risk = riskFromAssessment(latest);
      const due = isDue(latest);
      const noBaseline = !l.reading_baseline;

      // Check if assessed this calendar month
      if (latest?.created_at) {
        const d = new Date(latest.created_at);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          assessedThisMonth++;
        }
      }

      let urgency = 0;
      let reason = '';
      
      if (noBaseline) { urgency = 3; reason = 'Baseline Missing'; }
      else if (risk === 'HIGH') { urgency = 2; reason = 'High Risk'; }
      else if (due) { urgency = 1; reason = 'Assessment Due'; }
      
      if (urgency > 0) pendingCount++;

      return { learner: l, latest, risk, urgency, reason };
    }).filter(x => x.urgency > 0).sort((a, b) => b.urgency - a.urgency);

    return { 
      priorityList: priorities, 
      recentActivity: recent, 
      stats: { total: learners.length, assessedThisMonth, pendingCount } 
    };
  }, [learners, cloudAssessments]);

  const getLearnerName = (id) => {
    const l = learners.find(x => x.id === id);
    return l ? `${l.first_name} ${l.last_name}` : 'Unknown Learner';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header & Quick Metrics */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-4">Assessment Center</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{stats.total}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">Learners</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xl font-extrabold text-green-600 dark:text-green-400">{stats.assessedThisMonth}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">This Month</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl shadow-sm border border-orange-200 dark:border-orange-800 text-center">
            <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400">{stats.pendingCount}</p>
            <p className="text-[9px] font-bold text-orange-800 dark:text-orange-500 uppercase tracking-wider mt-1">Pending</p>
          </div>
        </div>
      </div>

      {/* Priority Assessments */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 px-1 flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" /> Priority Assessments
        </h3>
        
        <div className="space-y-3">
          {priorityList.length === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-6 text-center">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
              <p className="text-sm font-bold text-green-700 dark:text-green-400">All caught up!</p>
              <p className="text-xs text-green-600/80 dark:text-green-500/80 mt-1">No learners require immediate assessment.</p>
            </div>
          ) : (
            priorityList.map(({ learner, risk, reason }) => (
              <div 
                key={learner.id}
                onClick={() => onSelectLearner(learner)}
                className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-400 cursor-pointer transition group flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-blue-600 transition">
                      {learner.first_name} {learner.last_name}
                    </h4>
                    <RiskBadge level={risk} />
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {learner.grade_level} • {reason}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition text-blue-600 dark:text-blue-400">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 px-1 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" /> Recently Assessed
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {recentActivity.map((record, i) => (
              <div key={record.id} className={`p-3 flex justify-between items-center ${i !== recentActivity.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900 dark:text-white">{getLearnerName(record.learner_id)}</p>
                    <p className="text-[10px] text-gray-500">{record.checkpoint} Checkpoint</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400">
                  {new Date(record.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State / Selector Fallback */}
      {priorityList.length === 0 && recentActivity.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Data Yet</h3>
          <p className="text-sm text-gray-500 px-8">Add a learner to the roster to begin assessments.</p>
        </div>
      )}

    </div>
  );
}