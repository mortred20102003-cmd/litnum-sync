import { Sun, Moon } from 'lucide-react';

/* ---------- Learner Modal ---------- */
export function LearnerModal({ isOpen, onClose, newLearner, setNewLearner, onSave }) {
  if (!isOpen) return null;

  const input =
    "w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white";
  const upd = (patch) => setNewLearner({ ...newLearner, ...patch });

  const canSave =
    newLearner.firstName.trim().length > 0 &&
    newLearner.lastName.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Register New Learner
        </h3>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <input className={input} placeholder="First Name *" value={newLearner.firstName} onChange={e => upd({ firstName: e.target.value })} />
          <input className={input} placeholder="Last Name *"  value={newLearner.lastName}  onChange={e => upd({ lastName: e.target.value })} />
          <input className={input} placeholder="LRN (Learner Reference Number)" value={newLearner.lrn} onChange={e => upd({ lrn: e.target.value })} />
          
          <select className={input} value={newLearner.gradeLevel} onChange={e => upd({ gradeLevel: e.target.value })}>
            <option>Grade 1</option><option>Grade 2</option><option>Grade 3</option>
            <option>Grade 4</option><option>Grade 5</option><option>Grade 6</option>
          </select>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Reading Baseline (Form 1)</label>
            <select className={input} value={newLearner.readingBaseline} onChange={e => upd({ readingBaseline: e.target.value })}>
              <option value="">Select Level</option>
              <option value="Needs Support">Needs Support</option>
              <option value="Developing">Developing</option>
              <option value="Proficient">Proficient</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Numeracy Baseline (Form 1)</label>
            <select className={input} value={newLearner.numeracyBaseline} onChange={e => upd({ numeracyBaseline: e.target.value })}>
              <option value="">Select Level</option>
              <option value="Needs Support">Needs Support</option>
              <option value="Developing">Developing</option>
              <option value="Proficient">Proficient</option>
            </select>
          </div>

          <input className={input} placeholder="Priority Learning Need" value={newLearner.priorityNeed} onChange={e => upd({ priorityNeed: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 font-bold text-gray-500 dark:text-gray-400">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Intervention Modal ---------- */
export function InterventionModal({
  isOpen, onClose,
  interventionText, setInterventionText,
  onSave, learnerName,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Log Intervention</h3>
        {learnerName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">for {learnerName}</p>
        )}
        <textarea
          className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white h-32"
          placeholder="Action plan..."
          value={interventionText}
          onChange={e => setInterventionText(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 font-bold text-gray-500 dark:text-gray-400">Cancel</button>
          <button onClick={onSave}  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Plan</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Profile Modal ---------- */
export function ProfileModal({
  isOpen, onClose,
  tempDisplayName, setTempDisplayName,
  tempSchool, setTempSchool,
  tempGrade, setTempGrade,
  theme, setTheme, onSave,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Profile Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
            <input type="text"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              value={tempDisplayName} onChange={e => setTempDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">School Name</label>
            <input type="text"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              value={tempSchool} onChange={e => setTempSchool(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Grade Handled</label>
            <select
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              value={tempGrade} onChange={e => setTempGrade(e.target.value)}>
              <option value="">Select Grade</option>
              <option>Grade 1</option><option>Grade 2</option><option>Grade 3</option>
              <option>Grade 4</option><option>Grade 5</option><option>Grade 6</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Theme</label>
            <div className="flex gap-2">
              <button onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm ${
                  theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                }`}><Sun size={18}/> Light</button>
              <button onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm ${
                  theme === 'dark' ? 'border-blue-600 bg-blue-900/30 text-blue-400'
                                   : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                }`}><Moon size={18}/> Dark</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 font-bold text-gray-500 dark:text-gray-400">Cancel</button>
          <button onClick={onSave}  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Save Changes</button>
        </div>
      </div>
    </div>
  );
}