import React, { useState } from 'react';
import { useStore, actions } from '../store.js';

const STAGES = ['Drafted', 'Sent', 'Interview', 'Offer', 'Rejected'];

const STAGE_TONE = {
  Drafted: 'border-cockpit-edge text-gray-300',
  Sent: 'border-blue-500/40 text-blue-300',
  Interview: 'border-cockpit-warn/50 text-cockpit-warn',
  Offer: 'border-cockpit-accent/50 text-cockpit-accent',
  Rejected: 'border-cockpit-danger/40 text-cockpit-danger',
};

function Card({ app, onMove, onRemove, onSelect, selected }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', app.id)}
      onClick={() => onSelect(app)}
      className={`bg-cockpit-bg border rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-cockpit-accent transition ${
        selected ? 'border-cockpit-accent' : 'border-cockpit-edge'
      }`}
    >
      <div className="text-sm font-medium text-gray-100 truncate">{app.title}</div>
      <div className="text-[11px] text-cockpit-muted truncate">
        {app.company}{app.location ? ` · ${app.location}` : ''}
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-[10px] text-cockpit-muted font-mono">
          {new Date(app.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex gap-1">
          {app.link && (
            <a
              onClick={(e) => e.stopPropagation()}
              href={app.link}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-cockpit-muted hover:text-cockpit-accent"
            >
              ↗
            </a>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(app.id);
            }}
            className="text-[10px] text-cockpit-muted hover:text-cockpit-danger"
            aria-label="remove"
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              onMove(app.id, s);
            }}
            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
              app.stage === s ? 'bg-cockpit-edge text-gray-100' : 'text-cockpit-muted hover:text-gray-200'
            }`}
            title={`Move to ${s}`}
          >
            {s[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TrackerPanel() {
  const apps = useStore((s) => s.applications);
  const list = Object.values(apps).sort((a, b) => b.updatedAt - a.updatedAt);
  const [selected, setSelected] = useState(null);

  const onDrop = (e, stage) => {
    const id = e.dataTransfer.getData('text/plain');
    if (id) actions.setStage(id, stage);
  };

  const total = list.length;
  const counts = STAGES.reduce((acc, s) => {
    acc[s] = list.filter((a) => a.stage === s).length;
    return acc;
  }, {});

  return (
    <section className="panel h-full">
      <header className="panel-header">
        <span className="panel-title">04 · Application Board</span>
        <span className="text-[10px] font-mono text-cockpit-muted">
          {total} tracked · {counts.Interview || 0} interview · {counts.Offer || 0} offer
        </span>
      </header>

      <div className="flex-1 overflow-auto p-3">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-cockpit-muted">
            No applications yet. Track a job or draft a cold outreach.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3 h-full">
            {STAGES.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, stage)}
                className="bg-cockpit-panel2 border border-cockpit-edge rounded-md flex flex-col min-h-0"
              >
                <div className={`px-3 py-2 border-b border-cockpit-edge flex items-center justify-between border-l-2 ${STAGE_TONE[stage]}`}>
                  <span className="text-[10px] uppercase tracking-widest font-mono">
                    {stage}
                  </span>
                  <span className="text-[10px] font-mono text-cockpit-muted">
                    {counts[stage]}
                  </span>
                </div>
                <div className="p-2 space-y-2 overflow-auto flex-1">
                  {list
                    .filter((a) => a.stage === stage)
                    .map((a) => (
                      <Card
                        key={a.id}
                        app={a}
                        onMove={actions.setStage}
                        onRemove={actions.removeApplication}
                        onSelect={setSelected}
                        selected={selected?.id === a.id}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="border-t border-cockpit-edge p-3 bg-cockpit-panel2">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-100 truncate">{selected.title}</div>
              <div className="text-[11px] text-cockpit-muted">{selected.company}</div>
            </div>
            <button className="btn" onClick={() => setSelected(null)}>Close</button>
          </div>
          <textarea
            className="input w-full h-20 text-xs"
            placeholder="Notes — recruiter name, next step, dates..."
            value={apps[selected.id]?.notes || ''}
            onChange={(e) => actions.setNotes(selected.id, e.target.value)}
          />
        </div>
      )}
    </section>
  );
}
