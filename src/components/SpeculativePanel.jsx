import React, { useState } from 'react';
import { useStore, actions } from '../store.js';
import { mockCompanies } from '../data/mockCompanies.js';

function draftEmail({ company, profile, cv }) {
  const role = profile.titles[0] || 'a relevant role';
  const loc = profile.locations[0] || 'your team';
  const cvSnippet = cv.text
    ? cv.text.split(/\n+/).slice(0, 3).join(' ').slice(0, 240)
    : '[short paragraph from your CV]';
  return `Subject: ${role} — speculative intro to ${company.company}

Hi ${company.company} team,

I came across ${company.company} and the work in ${company.industry.toLowerCase()} resonates strongly. I noticed there are no open roles for ${role} right now, but I wanted to reach out anyway.

Briefly: ${cvSnippet.trim()}${cvSnippet.length >= 240 ? '…' : ''}

I'd love to chat if there's appetite for ${role} at ${loc}, even a 20-minute exploratory call. Happy to share my CV — attached.

Thanks for considering,
[Your name]`;
}

export default function SpeculativePanel() {
  const cv = useStore((s) => s.cv);
  const profile = useStore((s) => s.profile);
  const apps = useStore((s) => s.applications);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState('');

  const openDraft = (company) => {
    setOpen(company);
    setDraft(draftEmail({ company, profile, cv }));
  };

  const sendDraft = () => {
    if (!open) return;
    actions.trackApplication(
      { id: `spec-${open.id}`, title: `Speculative · ${open.company}`, company: open.company, location: open.location, link: open.site },
      'Drafted',
      { speculative: true, draft }
    );
    setOpen(null);
    setDraft('');
  };

  return (
    <section className="panel h-full">
      <header className="panel-header">
        <span className="panel-title">03 · Cold Outreach</span>
        <span className="text-[10px] font-mono text-cockpit-muted">
          {mockCompanies.length} firms · no open roles
        </span>
      </header>

      <div className="flex-1 overflow-auto divide-y divide-cockpit-edge">
        {mockCompanies.map((c) => {
          const tracked = !!apps[`spec-${c.id}`];
          return (
            <article key={c.id} className="p-4 hover:bg-cockpit-panel2 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-100">{c.company}</h3>
                    <span className="pill bg-cockpit-edge text-cockpit-muted">{c.stage}</span>
                    <span className="pill bg-cockpit-edge text-cockpit-muted">{c.size} ppl</span>
                  </div>
                  <div className="text-xs text-cockpit-muted mt-0.5">
                    {c.industry} · {c.location}
                  </div>
                  <p className="text-xs text-gray-300 mt-2">{c.why}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button className="btn-accent" onClick={() => openDraft(c)}>
                    {tracked ? 'Edit draft' : 'Draft application'}
                  </button>
                  <a className="btn" href={c.site} target="_blank" rel="noreferrer">
                    Site ↗
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {open && (
        <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="panel max-w-2xl w-full max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="panel-header">
              <span className="panel-title">Draft → {open.company}</span>
              <button className="btn" onClick={() => setOpen(null)}>Close</button>
            </header>
            <div className="p-4 flex-1 overflow-auto space-y-3">
              <textarea
                className="input w-full h-80 font-mono text-xs"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="text-[11px] text-cockpit-muted">
                Contact: <span className="font-mono">{open.contact}</span>
              </div>
            </div>
            <footer className="panel-header justify-end gap-2">
              <button
                className="btn"
                onClick={() => navigator.clipboard.writeText(draft)}
              >
                Copy
              </button>
              <a
                className="btn"
                href={`mailto:${open.contact}?subject=${encodeURIComponent(
                  draft.split('\n')[0].replace(/^Subject:\s*/, '')
                )}&body=${encodeURIComponent(draft.split('\n').slice(2).join('\n'))}`}
              >
                Open in mail
              </a>
              <button className="btn-accent" onClick={sendDraft}>
                Save & track
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
