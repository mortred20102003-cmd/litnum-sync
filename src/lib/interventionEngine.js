/**
 * Generates a "Next Instructional Step" based on the current assessment.
 * Overwrites only if the teacher hasn't typed anything custom.
 */
export function suggestIntervention(reading = {}, numeracy = {}) {
  const suggestions = [];

  if (reading.phonics === 'Needs Support')      suggestions.push('Daily phonics drills');
  if (reading.phonological === 'Needs Support') suggestions.push('Phonemic awareness warm-ups');
  if (reading.fluency === 'Needs Support')      suggestions.push('Guided oral reading (paired)');
  if (reading.vocabulary === 'Needs Support')   suggestions.push('Picture-word matching & word walls');
  if (reading.comprehension === 'Needs Support') suggestions.push('Story retelling with WH-questions');
  if (reading.oralLanguage === 'Needs Support') suggestions.push('Daily oral language circle');

  if (numeracy.mathReasoning === 'Needs Support')
    suggestions.push('Concrete-to-pictorial manipulation with CPA approach');

  return suggestions.join('; ');
}