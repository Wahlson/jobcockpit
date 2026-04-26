import React, { useEffect, useMemo, useState } from 'react';
import { useStore, actions } from '../store.js';
import { mockJobs } from '../data/mockJobs.js';
import { rankJobs } from '../lib/score.js';

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
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTick((x) => x + 1), 4000);
    return () => clearInterval(t);
  }, [paused]);

  const ranked = useMemo(() => {
    const ctx = { cvText: cv.text, profile };
    let r = rankJobs(mockJobs, ctx);
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
  }, [cv.text, profile, query, tick]);

  const ready = cv.fileName || cv.text || profile.titles.length;

  return (
    <section className="panel h-full">
      <header className="panel-header">
        <span className="panel-title flex items-center">
          <span className={paused ? '' : 'blink'}>02 · Live Job Screen</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cockpit-muted">
            {ranked.length} jobs · refresh {paused ? 'paused' : 'live'}
          </span>
          <button className="btn" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </header>

      <div className="px-4 py-2 border-b border-cockpit-edge">
        <input
          className="input w-full"
          placeholder="Filter by title, company, location, tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto divide-y divide-cockpit-edge">
        {!ready && (
          <div className="p-6 text-center text-sm text-cockpit-muted">
            Upload a CV and add target roles to start ranking.
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
                  </div>
                  <div className="text-xs text-cockpit-muted mt-0.5">
                    {job.company} · {job.location} · {job.salary} · posted {job.posted}
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
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                  >
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
