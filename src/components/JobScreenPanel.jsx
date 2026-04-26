import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, actions } from '../store.js';
import { rankJobs } from '../lib/score.js';
import {
  fetchJobs,
  FALLBACK_JOBS,
  SOURCE_KEYS,
  SOURCE_LABELS,
} from '../lib/jobsApi.js';

const REFRESH_MS = 5 * 60 * 1000;

function FitBar({ value }) {
  const color =
    value >= 75 ? 'bg-cockpit-accent' :
    value >= 50 ? 'bg-cockpit-warn' :
    'bg-cockpit-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-cockpit-edge rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-xs text-gray-200 w-8 text-right">{value}</span>
    </div>
  );
}

export default function JobScreenPanel() {
  const cv = useStore((s) => s.cv);
  const profile = useStore((s) => s.profile);
  const apps = useStore((s) => s.applications);

  const [query, setQuery] = useState('');
  const [enabledSources, setEnabledSources] = useState(SOURCE_KEYS);
  const [jobs, setJobs] = useState(FALLBACK_JOBS);
  const [usingFallback, setUsingFallback] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);

  const load = useCallback(
    async (q = '') => {
      setLoading(true);
      setErrors([]);
      try {
        const { jobs: fetched, errors: errs } = await fetchJobs({
          sources: enabledSources,
          query: q,
        });
        if (fetched.length) {
          setJobs(fetched);
          setUsingFallback(false);
        } else {
          setJobs(FALLBACK_JOBS);
          setUsingFallback(true);
        }
        setErrors(errs);
        setLastFetched(Date.now());
      } catch (e) {
        setErrors([{ source: 'all', message: e.message }]);
        setJobs(FALLBACK_JOBS);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    },
    [enabledSources]
  );

  useEffect(() => {
    load(profile.titles[0] || '');
    const t = setInterval(() => load(profile.titles[0] || ''), REFRESH_MS);
    return () => clearInterval(t);
  }, [load, profile.titles]);

  const ranked = useMemo(() => {
    const ctx = { cvText: cv.text, profile };
    let r = rankJobs(jobs, ctx);
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return r;
  }, [jobs, cv.text, profile, query]);

  const ready = cv.fileName || cv.text || profile.titles.length;

  const toggleSource = (key) => {
    setEnabledSources((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <section className="panel h-full">
      <header className="panel-header">
        <span className="panel-title flex items-center">
          <span className={loading ? 'blink' : ''}>02 · Live Job Screen</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cockpit-muted">
            {ranked.length} jobs
            {usingFallback && <span className="text-cockpit-warn"> · sample</span>}
            {lastFetched && !usingFallback && (
              <> · {new Date(lastFetched).toLocaleTimeString()}</>
            )}
          </span>
          <button
            className="btn"
            disabled={loading}
            onClick={() => load(profile.titles[0] || '')}
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="px-4 py-2 border-b border-cockpit-edge space-y-2">
        <input
          className="input w-full"
          placeholder="Filter loaded jobs by title, company, location, tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-cockpit-muted font-mono">
              Sources:
            </span>
            {SOURCE_KEYS.map((k) => {
              const on = enabledSources.includes(k);
              const failed = errors.find((e) => e.source === k);
              return (
                <button
                  key={k}
                  onClick={() => toggleSource(k)}
                  className={`pill border ${
                    on
                      ? 'bg-cockpit-accent/10 text-cockpit-accent border-cockpit-accent/40'
                      : 'bg-cockpit-edge text-cockpit-muted border-cockpit-edge'
                  }`}
                  title={failed ? `Error: ${failed.message}` : ''}
                >
                  {SOURCE_LABELS[k]}{failed ? ' ⚠' : ''}
                </button>
              );
            })}
          </div>
          {errors.length > 0 && (
            <span className="text-[10px] text-cockpit-warn font-mono">
              {errors.length} source{errors.length > 1 ? 's' : ''} failed
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-cockpit-edge">
        {!ready && (
          <div className="p-6 text-center text-sm text-cockpit-muted">
            Upload a CV and add target roles to start ranking.
          </div>
        )}
        {ready && ranked.length === 0 && !loading && (
          <div className="p-6 text-center text-sm text-cockpit-muted">
            No jobs match your filter.
          </div>
        )}
        {ready && ranked.map((job) => {
          const tracked = !!apps[job.id];
          return (
            <article key={job.id} className="p-4 hover:bg-cockpit-panel2 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-100 truncate">{job.title}</h3>
                    <span className="pill bg-cockpit-edge text-cockpit-muted">{job.seniority}</span>
                    <span className="pill bg-cockpit-edge text-cockpit-muted">{job.remote}</span>
                    {job.source && (
                      <span className="pill bg-cockpit-panel2 text-cockpit-muted border border-cockpit-edge">
                        {job.source}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-cockpit-muted mt-0.5">
                    {job.company} · {job.location}
                    {job.salary && job.salary !== '—' && ` · ${job.salary}`}
                    {job.posted && ` · posted ${job.posted}`}
                  </div>
                  <p className="text-xs text-gray-300 mt-2 line-clamp-2">{job.description}</p>
                  {job.reasons?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.reasons.map((r) => (
                        <span key={r} className="pill bg-cockpit-accent/10 text-cockpit-accent">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <FitBar value={job.fit} />
                  <a href={job.link} target="_blank" rel="noreferrer" className="btn">
                    Open ↗
                  </a>
                  <button
                    className={tracked ? 'btn' : 'btn-accent'}
                    onClick={() =>
                      tracked
                        ? actions.removeApplication(job.id)
                        : actions.trackApplication(job, 'Drafted')
                    }
                  >
                    {tracked ? 'Untrack' : 'Track'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
