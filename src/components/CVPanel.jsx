import React, { useRef, useState } from 'react';
import { useStore, actions } from '../store.js';

function TagInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) return setDraft('');
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-cockpit-muted mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="pill bg-cockpit-edge text-gray-200 flex items-center gap-1"
          >
            {v}
            <button
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-cockpit-muted hover:text-cockpit-danger"
              aria-label={`remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}

export default function CVPanel() {
  const cv = useStore((s) => s.cv);
  const profile = useStore((s) => s.profile);
  const fileRef = useRef(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState('');

  const onFile = async (file) => {
    if (!file) return;
    let text = '';
    if (/\.(txt|md|json|csv)$/i.test(file.name) || file.type.startsWith('text/')) {
      text = await file.text();
    } else {
      text = `[binary file ${file.name} — paste plain text below for better matching]`;
    }
    actions.setCV(file.name, text);
  };

  const ready = cv.fileName || cv.text;

  return (
    <section className="panel h-full">
      <header className="panel-header">
        <span className="panel-title">01 · Profile & CV</span>
        <span className="text-[10px] font-mono text-cockpit-muted">
          {ready ? 'LOADED' : 'AWAITING UPLOAD'}
        </span>
      </header>
      <div className="p-4 flex-1 overflow-auto space-y-4">
        {!ready && !pasteMode && (
          <div
            className="border-2 border-dashed border-cockpit-edge rounded-lg p-6 text-center cursor-pointer hover:border-cockpit-accent transition"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="text-sm text-gray-300">Drop your CV here or click to upload</div>
            <div className="text-[11px] text-cockpit-muted mt-1">
              .txt / .md parsed for matching · others stored by name
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="mt-3">
              <button
                className="btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setPasteMode(true);
                }}
              >
                Or paste CV text
              </button>
            </div>
          </div>
        )}

        {!ready && pasteMode && (
          <div className="space-y-2">
            <textarea
              className="input w-full h-40"
              placeholder="Paste your CV text here..."
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="btn-accent"
                onClick={() => {
                  if (!pasted.trim()) return;
                  actions.setCV('cv-pasted.txt', pasted);
                  setPasted('');
                  setPasteMode(false);
                }}
              >
                Save CV
              </button>
              <button className="btn" onClick={() => setPasteMode(false)}>Cancel</button>
            </div>
          </div>
        )}

        {ready && (
          <div className="bg-cockpit-panel2 border border-cockpit-edge rounded-md p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-mono">{cv.fileName || 'cv.txt'}</div>
              <div className="text-[11px] text-cockpit-muted">
                {cv.text ? `${cv.text.length.toLocaleString()} chars · uploaded ${new Date(cv.uploadedAt).toLocaleString()}` : 'no text extracted'}
              </div>
            </div>
            <button className="btn" onClick={() => actions.clearCV()}>Replace</button>
          </div>
        )}

        {ready && (
          <div className="border-t border-cockpit-edge pt-4">
            <div className="text-xs text-gray-300 mb-3">
              <span className="text-cockpit-accent">›</span> Now tell me what you're looking for.
            </div>
            <div className="space-y-3">
              <TagInput
                label="Target roles / titles"
                values={profile.titles}
                placeholder="e.g. Senior Product Manager"
                onChange={(v) => actions.setProfile({ titles: v })}
              />
              <TagInput
                label="Target locations"
                values={profile.locations}
                placeholder="e.g. Berlin, Remote, London"
                onChange={(v) => actions.setProfile({ locations: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-cockpit-muted mb-1">
                    Seniority
                  </label>
                  <select
                    className="input w-full"
                    value={profile.seniority}
                    onChange={(e) => actions.setProfile({ seniority: e.target.value })}
                  >
                    {['Junior','Mid','Senior','Staff','Lead','Director'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-cockpit-muted mb-1">
                    Work model
                  </label>
                  <select
                    className="input w-full"
                    value={profile.remote}
                    onChange={(e) => actions.setProfile({ remote: e.target.value })}
                  >
                    {['Onsite','Hybrid','Remote','Any'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-cockpit-muted mb-1">
                  Notes / dealbreakers
                </label>
                <textarea
                  className="input w-full h-16"
                  value={profile.notes}
                  placeholder="Anything else? min comp, no late-stage corporates, etc."
                  onChange={(e) => actions.setProfile({ notes: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
