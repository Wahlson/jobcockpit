import { mockJobs } from '../data/mockJobs.js';

const SENIORITY_RX = [
  [/principal|staff/i, 'Staff'],
  [/\bvp\b|head of|director/i, 'Director'],
  [/lead|manager/i, 'Lead'],
  [/senior|sr\./i, 'Senior'],
  [/junior|jr\.|entry|intern/i, 'Junior'],
];

function detectSeniority(title) {
  for (const [rx, label] of SENIORITY_RX) {
    if (rx.test(title)) return label;
  }
  return 'Mid';
}

function relTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!t) return '';
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function detectRemote(loc, remoteFlag) {
  if (remoteFlag) return 'Remote';
  if (/remote/i.test(loc || '')) return 'Remote';
  if (/hybrid/i.test(loc || '')) return 'Hybrid';
  return 'Onsite';
}

function normaliseRemotive(j) {
  const desc = stripHtml(j.description).slice(0, 400);
  return {
    id: `rmtv-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || 'Remote',
    remote: 'Remote',
    seniority: detectSeniority(j.title),
    posted: relTime(j.publication_date),
    salary: j.salary || '—',
    link: j.url,
    tags: (j.tags || []).slice(0, 6),
    description: desc,
    source: 'Remotive',
  };
}

function normaliseArbeitnow(j) {
  const desc = stripHtml(j.description).slice(0, 400);
  const created = j.created_at ? new Date(j.created_at * 1000).toISOString() : null;
  return {
    id: `arbn-${j.slug}`,
    title: j.title,
    company: j.company_name,
    location: j.location || (j.remote ? 'Remote' : '—'),
    remote: detectRemote(j.location, j.remote),
    seniority: detectSeniority(j.title),
    posted: relTime(created),
    salary: '—',
    link: j.url || `https://www.arbeitnow.com/jobs/${j.slug}`,
    tags: (j.tags || j.job_types || []).slice(0, 6),
    description: desc,
    source: 'Arbeitnow',
  };
}

async function fetchRemotive(query) {
  const url = `https://remotive.com/api/remote-jobs${
    query ? `?search=${encodeURIComponent(query)}` : ''
  }`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Remotive ${res.status}`);
  const data = await res.json();
  return (data.jobs || []).slice(0, 60).map(normaliseRemotive);
}

async function fetchArbeitnow() {
  const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
  if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
  const data = await res.json();
  return (data.data || []).slice(0, 60).map(normaliseArbeitnow);
}

const SOURCES = {
  remotive: { label: 'Remotive', fetch: fetchRemotive },
  arbeitnow: { label: 'Arbeitnow', fetch: fetchArbeitnow },
};

export const SOURCE_KEYS = Object.keys(SOURCES);
export const SOURCE_LABELS = Object.fromEntries(
  Object.entries(SOURCES).map(([k, v]) => [k, v.label])
);

export async function fetchJobs({ sources, query } = {}) {
  const enabled = sources && sources.length ? sources : SOURCE_KEYS;
  const results = await Promise.allSettled(
    enabled.map((k) => SOURCES[k].fetch(query))
  );
  const jobs = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') jobs.push(...r.value);
    else errors.push({ source: enabled[i], message: r.reason?.message || 'failed' });
  });
  return { jobs, errors };
}

export const FALLBACK_JOBS = mockJobs.map((j) => ({ ...j, source: 'Sample' }));
