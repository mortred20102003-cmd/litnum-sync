/**
 * Score-based risk classifier.
 * Each "Needs Support" = 2 pts, each "Developing" = 1 pt.
 * Numeracy reasoning is weighted the same as one reading dimension.
 */
export function calculateRisk(reading = {}, numeracy = {}) {
  let score = 0;

  Object.values(reading).forEach((v) => {
    if (v === 'Needs Support') score += 2;
    else if (v === 'Developing') score += 1;
  });

  const numLevel = numeracy.mathReasoning;
  if (numLevel === 'Needs Support') score += 2;
  else if (numLevel === 'Developing') score += 1;

  if (score >= 8) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

export function riskFromAssessment(assessment) {
  if (!assessment) return 'UNKNOWN';
  return calculateRisk(
    assessment.reading_components || {},
    assessment.numeracy_components || {}
  );
}

/**
 * Ranked list of problem areas (Needs Support first, then Developing).
 * Useful for the principal dashboard's "Top Problem Areas" panel.
 */
export function topProblemAreas(assessments, limit = 3) {
  const counts = {};

  const bump = (key, weight) => {
    counts[key] = (counts[key] || 0) + weight;
  };

  assessments.forEach((a) => {
    const r = a.reading_components || {};
    Object.entries(r).forEach(([k, v]) => {
      if (['assessmentText', 'overallReading'].includes(k)) return;
      if (v === 'Needs Support') bump(k, 2);
      else if (v === 'Developing') bump(k, 1);
    });
    const num = a.numeracy_components?.mathReasoning;
    if (num === 'Needs Support') bump('mathReasoning', 2);
    else if (num === 'Developing') bump('mathReasoning', 1);
  });

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key]) => key);
}