const STOP = new Set([
  'the','and','for','with','from','that','this','have','your','you','our','are','was','were','will','about',
  'into','any','all','can','but','not','its','their','they','them','than','then','also','more','most',
  'a','an','of','to','in','on','at','by','is','it','as','or','be','we','i','my','me','do','if','so'
]);

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+# ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export function scoreJob(job, { cvText, profile }) {
  const targetTitles = (profile?.titles || []).map((t) => t.toLowerCase());
  const targetLocs = (profile?.locations || []).map((l) => l.toLowerCase());
  const cvTokens = new Set(tokenize(cvText));
  const targetTokens = new Set(targetTitles.flatMap((t) => tokenize(t)));
  const jobBlob = `${job.title} ${job.tags?.join(' ') || ''} ${job.description || ''}`;
  const jobTokens = tokenize(jobBlob);

  let cvOverlap = 0;
  let targetOverlap = 0;
  for (const tok of jobTokens) {
    if (cvTokens.has(tok)) cvOverlap++;
    if (targetTokens.has(tok)) targetOverlap++;
  }

  const cvScore = jobTokens.length ? cvOverlap / jobTokens.length : 0;
  const titleScore = targetTokens.size ? Math.min(1, targetOverlap / Math.max(3, targetTokens.size)) : 0;

  const locScore = targetLocs.length === 0
    ? 0.5
    : targetLocs.some((l) =>
        job.location.toLowerCase().includes(l) ||
        (l === 'remote' && /remote/i.test(job.location))
      )
      ? 1
      : job.remote === 'Remote' ? 0.6 : 0.1;

  const seniorityScore = !profile?.seniority
    ? 0.5
    : job.seniority?.toLowerCase().includes(profile.seniority.toLowerCase()) ? 1 : 0.4;

  const fit = Math.round(
    (titleScore * 0.45 + cvScore * 0.25 + locScore * 0.2 + seniorityScore * 0.1) * 100
  );

  const reasons = [];
  if (titleScore > 0.4) reasons.push('title match');
  else if (titleScore > 0.15) reasons.push('partial title');
  if (cvScore > 0.08) reasons.push('CV keyword overlap');
  if (locScore === 1) reasons.push('preferred location');
  else if (locScore >= 0.6) reasons.push('remote-friendly');
  if (seniorityScore === 1) reasons.push('seniority match');

  return { fit: Math.max(5, Math.min(99, fit)), reasons };
}

export function rankJobs(jobs, ctx) {
  return jobs
    .map((j) => ({ ...j, ...scoreJob(j, ctx) }))
    .sort((a, b) => b.fit - a.fit);
}
