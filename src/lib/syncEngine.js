import { db } from './db';
import { supabase } from './supabaseClient';

export const syncData = async () => {
  if (!navigator.onLine) {
    console.log('Offline. Skipping sync.');
    return;
  }

  try {
    const pendingAssessments = await db.assessments
      .where('sync_status')
      .equals('pending')
      .toArray();

    if (pendingAssessments.length === 0) {
      console.log('No pending data to sync.');
      return;
    }

    console.log(`Found ${pendingAssessments.length} pending records. Syncing...`);

    for (const assessment of pendingAssessments) {
      const { error } = await supabase
        .from('assessments')
        .insert([
          {
            id: assessment.id,
            learner_id: assessment.learner_id,
            checkpoint: assessment.checkpoint,
            reading_components: assessment.reading_components,
            numeracy_components: assessment.numeracy_components,
            next_instructional_step: assessment.next_instructional_step
          }]);

      if (error) {
        console.error('Error syncing record:', error);
        if (error.code !== '23505') continue; 
      }

      // DELETE the record locally now that it's safely in the cloud
      await db.assessments.delete(assessment.id);
    }

    console.log('✅ Sync complete!');

  } catch (error) {
    console.error('Sync failed:', error);
  }
};