import React, { useMemo, useState } from 'react';
import { useStore, actions } from '../store.js';
import { mockCompanies, INDUSTRIES } from '../data/mockCompanies.js';
import { findCareersEmail, inferCompanyFromUrl } from '../lib/scrape.js';

function draftEmail({ company, profile, cv, contactEmail }) {
  const role = profile.titles[0] || 'a relevant role';
  const loc = profile.locations[0] || 'your team';
  const cvSnippet = cv.text
    ? cv.text.split(/\n+/).slice(0, 3).join(' ').slice(0, 240)
    : '[short paragraph from your CV]';
  return `Subject: ${role} — speculative intro to ${company.company}

Hi ${company.company} team,

I came across ${company.company} and the work in ${(company.industry || 'your space').toLowerCase()} resonates strongly. I noticed there are no open roles for ${role} right now, but I wanted to reach out anyway.

Briefly: ${cvSnippet.trim()}${cvSnippet.length >= 240 ? '…' : ''}

I'd love to chat if there's appetite for ${role} at ${loc}, even a 20-minute exploratory call. Happy to share my CV — attached.

Thanks for considering,
[Your name]`;
}

export default function SpeculativePanel() {
  const cv = useStore((s) => s.cv);
  const profile = useStore((s) => s.profile);
  const apps = useStore((s) => s.applications);

  const [query, setQuery] = useState('');
  const [activeIndustries, setActiveIndustries] = useState([]);
  const [customUrl, setCustomUrl] = useState('');
  const [customCompanies, setCustomCompanies] = useState([]);
  const [scrapes, setScrapes] = useState({});
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState('');

  const allCompanies = useMemo(
    () => [...customCompanies, ...mockCompanies],
    [customCompanies]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCompanies.filter((c) => {
      const indOk =
        activeIndustries.length === 0 || activeIndustries.includes(c.industry);
      const qOk =
        !q ||
        c.company.toLowerCase().includes(q) ||
        (c.industry || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q) ||
        (c.why || '').toLowerCase().includes(q);
      return indOk && qOk;
    });
  }, [allCompanies, query, activeIndustries]);

  const toggleIndustry = (ind) =>
    setActiveIndustries((p) =>
      p.includes(ind) ? p.filter((x) => x !== ind) : [...p, ind]
    );

  const addCustom = () => {
    const url = customUrl.trim();
    if (!url) return;
    const id = `custom-${url.replace(/[^a-z0-9]/gi, '').slice(0, 24)}-${Date.now()}`;
    const company = inferCompanyFromUrl(url) || 'Custom company';
    setCustomCompanies((p) => [
      { id, company, industry: 'Custom', location: '—', stage: '—', size: '—', site: url, why: 'Added by you.' },
      ...p,
    ]);
    setCustomUrl('');
  };

  const runScrape = async (c) => {
    if (!c.site) return;
    setScrapes((p) => ({ ...p, [c.id]: { loading: true, error: null, result: null, progress: '' } }));
    try {
      const result = await findCareersEmail(c.site, {
        onProgress: ({ target, visited, total }) =>
          setScrapes((p) => ({
            ...p,
            [c.id]: { ...(p[c.id] || {}), loading: true, progress: `${visited}/${total} · ${target}` },
          })),
      });
      setScrapes((p) => ({ ...p, [c.id]: { loading: false, error: null, result, selected: result.emails[0] || null } }));
    } catch (e) {
      setScrapes((p) => ({ ...p, [c.id]: { loading: false, error: e.message || 'Failed', result: null } }));
    }
  };

  const selectEmail = (id, email) =>
    setScrapes((p) => ({ ...p, [id]: { ...(p[id] || {}), selected: email } }));

  const openDraft = (company) => {
    const contactEmail = scrapes[company.id]?.selected || company.contact || '';
    setOpen({ ...company, contact: contactEmail });
    setDraft(draftEmail({ company, profile, cv, contactEmail }));
  };

  const sendDraft = () => {
    if (!open) return;
    actions.trackApplication(
      {
        id: `spec-${open.id}`,
        title: `Speculative · ${open.company}`,
        company: open.company,
        location: open.location,
        link: open.site,
      },
      'Drafted',
      { speculative: true, draft, contact: open.contact }
    );
    setOpen(null);
    setDraft('');
  };

  const mailto = (contact, body) => {
    const subject = body.split('\n')[0].replace(/^Subject:\s*/, '');
    const rest = body.split('\n').slice(2).join('\n');
    return `mailto:${contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(rest)}`;
  };

  return (
    <section className="panel h-full">
      <header className="panel-header">
        <span className="panel-title">03 · Cold Outreach</span>
        <span className="text-[10px] font-mono text-cockpit-muted">
          {filtered.length} firms · scrape for careers email
        </span>
      </header>

      <div className="px-4 py-3 border-b border-cockpit-edge space-y-3 bg-cockpit-panel2">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-cockpit-muted mb-1">
            What type of firms are you looking for?
          </label>
          <input
            className="input w-full"
            placeholder="Free-text: e.g. climate berlin, fintech, european AI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {INDUSTRIES.map((ind) => {
            const on = activeIndustries.includes(ind);
            return (
              <button
                key={ind}
                onClick={() => toggleIndustry(ind)}
                className={`pill border ${
                  on
                    ? 'bg-cockpit-accent/10 text-cockpit-accent border-cockpit-accent/40'
                    : 'bg-cockpit-edge text-cockpit-muted border-cockpit-edge'
                }`}
              >
                {ind}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Or paste any company URL to scrape..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button className="btn" onClick={addCustom}>Add</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-cockpit-edge">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-cockpit-muted">
            No firms match. Loosen filters or paste a URL.
          </div>
        )}
        {filtered.map((c) => {
          const tracked = !!apps[`spec-${c.id}`];
          const scrape = scrapes[c.id];
          return (
            <article key={c.id} className="p-4 hover:bg-cockpit-panel2 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-100">{c.company}</h3>
                    <span className="pill bg-cockpit-edge text-cockpit-muted">{c.industry}</span>
                    {c.stage !== '—' && <span className="pill bg-cockpit-edge text-cockpit-muted">{c.stage}</span>}
                    {c.size !== '—' && <span className="pill bg-cockpit-edge text-cockpit-muted">{c.size}</span>}
                  </div>
                  <div className="text-xs text-cockpit-muted mt-0.5">
                    {c.location} · <a className="hover:text-cockpit-accent" href={c.site} target="_blank" rel="noreferrer">{c.site.replace(/^https?:\/\//, '')}</a>
                  </div>
                  <p className="text-xs text-gray-300 mt-2">{c.why}</p>

                  {scrape && (
                    <div className="mt-2 text-[11px] font-mono">
                      {scrape.loading && (
                        <span className="text-cockpit-muted">scraping… {scrape.progress}</span>
                      )}
                      {scrape.error && (
                        <span className="text-cockpit-danger">scrape failed: {scrape.error}</span>
                      )}
                      {scrape.result && scrape.result.emails.length === 0 && (
                        <span className="text-cockpit-warn">no email found on {scrape.result.domain || 'site'}</span>
                      )}
                      {scrape.result && scrape.result.emails.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-cockpit-muted">
                            found {scrape.result.emails.length} email{scrape.result.emails.length > 1 ? 's' : ''}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {scrape.result.emails.slice(0, 6).map((em) => (
                              <button
                                key={em}
                                onClick={() => selectEmail(c.id, em)}
                                className={`pill border ${
                                  scrape.selected === em
                                    ? 'bg-cockpit-accent/10 text-cockpit-accent border-cockpit-accent/40'
                                    : 'bg-cockpit-edge text-gray-200 border-cockpit-edge hover:text-cockpit-accent'
                                }`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    className="btn"
                    disabled={scrape?.loading}
                    onClick={() => runScrape(c)}
                  >
                    {scrape?.loading ? '…' : scrape?.result ? 'Re-scrape' : 'Find email'}
                  </button>
                  <button className="btn-accent" onClick={() => openDraft(c)}>
                    {tracked ? 'Edit draft' : 'Draft'}
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
          <div className="panel max-w-2xl w-full max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <header className="panel-header">
              <span className="panel-title">Draft → {open.company}</span>
              <button className="btn" onClick={() => setOpen(null)}>Close</button>
            </header>
            <div className="p-4 flex-1 overflow-auto space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-cockpit-muted">To:</span>
                <input
                  className="input flex-1"
                  placeholder="careers@company.com (or scrape from card)"
                  value={open.contact || ''}
                  onChange={(e) => setOpen({ ...open, contact: e.target.value })}
                />
              </div>
              <textarea
                className="input w-full h-72 font-mono text-xs"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <footer className="panel-header justify-end gap-2">
              <button className="btn" onClick={() => navigator.clipboard.writeText(draft)}>
                Copy
              </button>
              <a
                className={`btn ${!open.contact ? 'opacity-50 pointer-events-none' : ''}`}
                href={open.contact ? mailto(open.contact, draft) : undefined}
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
