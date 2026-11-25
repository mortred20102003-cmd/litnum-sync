import { useState } from 'react';
import { ArrowLeft, BookOpen, Calculator, AlertTriangle, ClipboardList, TrendingUp, CheckCircle2, CircleDashed } from 'lucide-react';
import RiskBadge from '../RiskBadge';
import { riskFromAssessment } from '../../lib/riskEngine';

export default function LearnerProfile({ learner, allAssessments, onBack, onAssess }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'mastery'

  // Sort newest to oldest
  const history = allAssessments
    .filter(a => a.learner_id === learner.id)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const latest = history[0];
  const earliest = history[history.length - 1]; // The baseline

  const risk = riskFromAssessment(latest);

  // Determine Baseline vs Current
  const currentReading = latest?.reading_components?.fluency || 'No Data';
  const baselineReading = learner.reading_baseline || earliest?.reading_components?.fluency || 'Not Set';
  
  const currentNum = latest?.numeracy_components?.mathReasoning || 'No Data';
  const baselineNum = learner.numeracy_baseline || earliest?.numeracy_components?.mathReasoning || 'Not Set';

  const getStatusIcon = (status) => {
    if (status === 'Mastered' || status === 'Proficient') return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === 'Partially Mastered' || status === 'Developing') return <CircleDashed size={16} className="text-yellow-500" />;
    return <AlertTriangle size={16} className="text-red-500" />;
  };

  return (
    <div className="animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pt-2">
        <button onClick={onBack} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 hover:text-blue-600 transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
            {learner.first_name} {learner.last_name}
          </h2>
          <p className="text-xs text-gray-500 font-medium">{learner.grade_level} • LRN: {learner.lrn || 'N/A'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-xl mb-4">
        {['overview', 'mastery', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition ${
              activeTab === tab ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}>{tab}</button>
        ))}
      </div>

      {/* OVERVIEW TAB (Form 5) */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Growth Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 uppercase">Current Risk Level</span>
              <RiskBadge level={risk} />
            </div>

            {/* Reading Growth */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                <BookOpen size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Reading Progress</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Baseline</p>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{baselineReading}</p>
                </div>
                <TrendingUp className="text-gray-300" size={20} />
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Current</p>
                  <p className="font-bold text-sm text-blue-600 dark:text-blue-400">{currentReading}</p>
                </div>
              </div>
            </div>

            {/* Numeracy Growth */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                <Calculator size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Numeracy Progress</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Baseline</p>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{baselineNum}</p>
                </div>
                <TrendingUp className="text-gray-300" size={20} />
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Current</p>
                  <p className="font-bold text-sm text-orange-600 dark:text-orange-400">{currentNum}</p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onAssess} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md flex justify-center items-center gap-2">
            <ClipboardList size={18} /> New Assessment
          </button>
        </div>
      )}

      {/* MASTERY TAB (Form 4) */}
      {activeTab === 'mastery' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Competency Mastery</h3>
          
          {latest?.competency_mastery ? (
            <div className="space-y-3">
              {Object.entries(latest.competency_mastery).map(([skill, status]) => (
                <div key={skill} className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{skill.replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold">
                    {getStatusIcon(status)} {status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">No mastery data recorded yet.</p>
          )}
        </div>
      )}

      {/* HISTORY TAB (Form 2/3 Evidence) */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">No assessments recorded yet.</p>
            </div>
          ) : (
            history.map((record) => (
              <div key={record.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{record.checkpoint} Checkpoint</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(record.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {/* Evidence display (Form 2/3) */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-xs space-y-1">
                  {record.reading_evidence && <p><span className="font-bold text-gray-500">Reading Evidence:</span> {record.reading_evidence}</p>}
                  {record.numeracy_evidence && <p><span className="font-bold text-gray-500">Numeracy Evidence:</span> {record.numeracy_evidence}</p>}
                  {!record.reading_evidence && !record.numeracy_evidence && <p className="text-gray-400 italic">No specific evidence recorded.</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}