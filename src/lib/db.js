import Dexie from 'dexie';

export const db = new Dexie('LitNumSyncDB');
db.version(1).stores({
  learners: 'id, lastName, gradeLevel',
  assessments: 'id, learner_id, sync_status'
});
