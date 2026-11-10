import { db } from './db';
import { supabase } from './supabaseClient';

export const syncData = async () => {
  // 1. Check if we are online
  if (!navigator.onLine) {
    console.log('Offline. Skipping sync.');
    return;
  }

  try {
    // 2. Get all assessments marked as 'pending' from IndexedDB
    const pendingAssessments = await db.assessments
      .where('sync_status')
      .equals('pending')
      .toArray();

    if (pendingAssessments.length === 0) {
      console.log('No pending data to sync.');
      return;
    }

    console.log(`Found ${pendingAssessments.length} pending records. Syncing...`);

    // 3. Push to Supabase
    for (const assessment of pendingAssessments) {
      // We send the data to the 'assessments' table in Supabase
      const { error } = await supabase
        .from('assessments')
        .insert([
          {
            id: assessment.id,
  learner_id: assessment.learner_id,
  checkpoint: assessment.checkpoint, // <-- NEW
  reading_components: assessment.reading_components,
  numeracy_components: assessment.numeracy_components, // <-- NEW
  next_instructional_step: assessment.next_instructional_step
}]);

      if (error) {
        console.error('Error syncing record:', error);
        // If there's a duplicate ID error, we still want to mark it as synced so it doesn't get stuck
        if (error.code !== '23505') continue; 
      }

      // 4. Update local status to 'synced' so we don't send it again
      await db.assessments.update(assessment.id, { sync_status: 'synced' });
    }

    console.log('✅ Sync complete!');

  } catch (error) {
    console.error('Sync failed:', error);
  }
};