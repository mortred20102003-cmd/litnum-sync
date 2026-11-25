import { useEffect, useState } from 'react';
import { Save, CheckCircle, AlertTriangle, BookOpen, Calculator, Check, History } from 'lucide-react';
import { db } from '../../lib/db';
import LevelButton from '../LevelButton';
import { suggestIntervention } from '../../lib/interventionEngine';

export default function AssessmentForm({ learner, cloudAssessments, onClose, onSaved }) {
  const [activeSubject, setActiveSubject] = useState('reading');
  const [isSaved, setIsSaved] = useState(false);
  const [checkpoint, setCheckpoint] = useState('Monthly');
  
  // Evidence & Next Steps
  const [nextStep, setNextStep] = useState('');
  const [nextStepDirty, setNextStepDirty] = useState(false);
  const [assessmentText, setAssessmentText] = useState('');
  const [readingEvidence, setReadingEvidence] = useState('');
  const [numeracyEvidence, setNumeracyEvidence] = useState('');

  // Mastery Trackers (Form 4)
  const [masteryReading, setMasteryReading] = useState({ main_idea: 'Not Yet Mastered', inference: 'Not Yet Mastered' });
  const [masteryNumeracy, setMasteryNumeracy] = useState({ number_sense: 'Not Yet Mastered', operations: 'Not Yet Mastered' });

  const [readingData, setReadingData] = useState({
    oralLanguage: 'Developing', phonological: 'Developing', phonics: 'Developing',
    vocabulary: 'Developing', fluency: 'Developing', comprehension: 'Developing',
  });
  const [numeracyData, setNumeracyData] = useState({
    competency: 'Subtracts 2-digit numbers with regrouping',
    cpaStage: 2,
    mathReasoning: 'Developing',
  });

  const intervention = cloudAssessments.find((a) => a.learner_id === learner.id && a.intervention_plan);
  const history = cloudAssessments.filter((a) => a.learner_id === learner.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Auto-fill next step
  useEffect(() => {
    if (nextStepDirty) return;
    const suggestion = suggestIntervention(readingData, numeracyData);
    if (suggestion) setNextStep(suggestion);
  }, [readingData, numeracyData, nextStepDirty]);

  const handleSave = async () => {
    try {
      await db.assessments.add({
        id: crypto.randomUUID(),
        learner_id: learner.id,
        checkpoint,
        reading_components: { ...readingData, assessmentText },
        numeracy_components: numeracyData,
        reading_evidence: readingEvidence, // <-- New
        numeracy_evidence: numeracyEvidence, // <-- New
        competency_mastery: { ...masteryReading, ...masteryNumeracy }, // <-- New
        next_instructional_step: nextStep,
        sync_status: 'pending',
      });
      setIsSaved(true);
      setTimeout(() => { setIsSaved(false); onSaved?.(); }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-blue-900 text-white">
        <div>
          <h2 className="font-bold text-lg leading-tight">{learner.first_name} {learner.last_name}</h2>
        </div>
        <button onClick={onClose} className="text-xs bg-white/20 px-3 py-1.5 rounded-lg font-semibold">Close</button>
      </div>

      <div className="p-4 space-y-5">
        {intervention && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded-r-xl">
             <h4 className="text-xs font-bold text-yellow-800 dark:text-yellow-400">Principal's Plan: <span className="font-normal">{intervention.intervention_plan}</span></h4>
          </div>
        )}

        {/* Checkpoint */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Monitoring Checkpoint</label>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl gap-1">
            {['Baseline', 'Monthly', 'Endline'].map((cp) => (
              <button key={cp} onClick={() => setCheckpoint(cp)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${checkpoint === cp ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}>{cp}</button>
            ))}
          </div>
        </div>

        {/* Subject tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button onClick={() => setActiveSubject('reading')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 ${activeSubject === 'reading' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><BookOpen size={14}/> Reading</button>
          <button onClick={() => setActiveSubject('numeracy')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 ${activeSubject === 'numeracy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><Calculator size={14}/> Numeracy</button>
        </div>

        {/* READING SECTION */}
        {activeSubject === 'reading' && (
          <div className="space-y-4 animate-fade-in">
            {[
              { k: 'fluency', label: 'Fluency' },
              { k: 'comprehension', label: 'Comprehension' },
            ].map((item) => (
              <div key={item.k} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="font-bold text-xs mb-2">{item.label}</p>
                <div className="flex gap-1.5">
                  <LevelButton label="Needs" type="ns" active={readingData[item.k] === 'Needs Support'} onClick={() => setReadingData({...readingData, [item.k]: 'Needs Support'})} />
                  <LevelButton label="Developing" type="dv" active={readingData[item.k] === 'Developing'} onClick={() => setReadingData({...readingData, [item.k]: 'Developing'})} />
                  <LevelButton label="Proficient" type="pf" active={readingData[item.k] === 'Proficient'} onClick={() => setReadingData({...readingData, [item.k]: 'Proficient'})} />
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reading Evidence (e.g., 52 WPM, 4/5 questions)</label>
              <input type="text" className="w-full p-2.5 border rounded-xl bg-gray-50 text-xs" placeholder="Record observation..." value={readingEvidence} onChange={(e) => setReadingEvidence(e.target.value)} />
            </div>

            {/* Form 4 Tracker (Reading) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
               <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase mb-2">Competency Mastery</p>
               {Object.keys(masteryReading).map(skill => (
                 <div key={skill} className="flex justify-between items-center mb-2">
                   <span className="text-xs capitalize">{skill.replace('_', ' ')}</span>
                   <select className="text-[10px] p-1 rounded border" value={masteryReading[skill]} onChange={(e) => setMasteryReading({...masteryReading, [skill]: e.target.value})}>
                     <option>Not Yet Mastered</option>
                     <option>Partially Mastered</option>
                     <option>Mastered</option>
                   </select>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* NUMERACY SECTION */}
        {activeSubject === 'numeracy' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="font-bold text-xs mb-2">Mathematical Reasoning</p>
                <select className="w-full p-2.5 rounded-xl border text-xs" value={numeracyData.mathReasoning} onChange={(e) => setNumeracyData({...numeracyData, mathReasoning: e.target.value})}>
                  <option>Needs Support</option>
                  <option>Developing</option>
                  <option>Proficient</option>
                </select>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Numeracy Evidence (e.g., Solved 8/10 problems)</label>
              <input type="text" className="w-full p-2.5 border rounded-xl bg-gray-50 text-xs" placeholder="Record observation..." value={numeracyEvidence} onChange={(e) => setNumeracyEvidence(e.target.value)} />
            </div>

            {/* Form 4 Tracker (Numeracy) */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800">
               <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase mb-2">Competency Mastery</p>
               {Object.keys(masteryNumeracy).map(skill => (
                 <div key={skill} className="flex justify-between items-center mb-2">
                   <span className="text-xs capitalize">{skill.replace('_', ' ')}</span>
                   <select className="text-[10px] p-1 rounded border" value={masteryNumeracy[skill]} onChange={(e) => setMasteryNumeracy({...masteryNumeracy, [skill]: e.target.value})}>
                     <option>Not Yet Mastered</option>
                     <option>Partially Mastered</option>
                     <option>Mastered</option>
                   </select>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Next Step (Auto-filled) */}
        <div className="pt-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Next Instructional Step</label>
          <textarea className="w-full p-3 border rounded-xl bg-gray-50 text-xs h-16" value={nextStep} onChange={(e) => { setNextStep(e.target.value); setNextStepDirty(true); }} />
        </div>

        <button onClick={handleSave} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md flex justify-center items-center gap-2 transition">
          {isSaved ? <CheckCircle size={18}/> : <Save size={18}/>} {isSaved ? 'Saved Offline!' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}