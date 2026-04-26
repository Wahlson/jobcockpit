import React from 'react';
import CVPanel from './components/CVPanel.jsx';
import JobScreenPanel from './components/JobScreenPanel.jsx';
import SpeculativePanel from './components/SpeculativePanel.jsx';
import TrackerPanel from './components/TrackerPanel.jsx';
import { useStore } from './store.js';

export default function App() {
  const apps = useStore((s) => s.applications);
  const profile = useStore((s) => s.profile);
  const cv = useStore((s) => s.cv);
  const totals = Object.values(apps);

  return (
    <div className="h-full w-full flex flex-col p-3 gap-3">
      <header className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cockpit-accent rounded-full animate-pulse" />
          <h1 className="text-sm font-mono uppercase tracking-[0.3em] text-gray-200">
            Job Search Cockpit
          </h1>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-cockpit-muted">
          <span>
            CV: {cv.fileName ? <span className="text-cockpit-accent">{cv.fileName}</span> : 'none'}
          </span>
          <span>Targets: <span className="text-gray-200">{profile.titles.length}</span></span>
          <span>Locations: <span className="text-gray-200">{profile.locations.length}</span></span>
          <span>Pipeline: <span className="text-gray-200">{totals.length}</span></span>
        </div>
      </header>

      <div
        className="grid gap-3 flex-1 min-h-0"
        style={{
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr) 320px',
        }}
      >
        <div className="col-span-4 row-span-1 min-h-0">
          <CVPanel />
        </div>
        <div className="col-span-8 row-span-2 min-h-0 relative">
          <JobScreenPanel />
        </div>
        <div className="col-span-4 row-span-1 min-h-0 relative">
          <SpeculativePanel />
        </div>
        <div className="col-span-12 min-h-0" style={{ gridRow: '3 / 4' }}>
          <TrackerPanel />
        </div>
      </div>
    </div>
  );
}
