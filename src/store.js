import { useEffect, useState, useCallback } from 'react';

const KEY = 'jobcockpit-state-v1';

const defaultState = {
  cv: {
    fileName: '',
    text: '',
    uploadedAt: null,
  },
  profile: {
    titles: [],
    locations: [],
    seniority: 'Mid',
    remote: 'Hybrid',
    notes: '',
  },
  applications: {},
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

let listeners = new Set();
let state = load();

function set(updater) {
  state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l(state));
}

export function useStore(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const l = (s) => setSnap(selector(s));
    listeners.add(l);
    return () => listeners.delete(l);
  }, [selector]);
  return snap;
}

export const actions = {
  setCV(fileName, text) {
    set((s) => ({ ...s, cv: { fileName, text, uploadedAt: Date.now() } }));
  },
  clearCV() {
    set((s) => ({ ...s, cv: { fileName: '', text: '', uploadedAt: null } }));
  },
  setProfile(patch) {
    set((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },
  trackApplication(jobOrCompany, stage = 'Drafted', extra = {}) {
    const id = jobOrCompany.id;
    set((s) => ({
      ...s,
      applications: {
        ...s.applications,
        [id]: {
          id,
          title: jobOrCompany.title || jobOrCompany.role || 'Speculative',
          company: jobOrCompany.company,
          location: jobOrCompany.location,
          link: jobOrCompany.link || jobOrCompany.url || '',
          stage,
          updatedAt: Date.now(),
          createdAt: s.applications[id]?.createdAt ?? Date.now(),
          notes: s.applications[id]?.notes ?? '',
          ...extra,
        },
      },
    }));
  },
  setStage(id, stage) {
    set((s) => {
      const a = s.applications[id];
      if (!a) return s;
      return {
        ...s,
        applications: {
          ...s.applications,
          [id]: { ...a, stage, updatedAt: Date.now() },
        },
      };
    });
  },
  setNotes(id, notes) {
    set((s) => {
      const a = s.applications[id];
      if (!a) return s;
      return {
        ...s,
        applications: { ...s.applications, [id]: { ...a, notes } },
      };
    });
  },
  removeApplication(id) {
    set((s) => {
      const next = { ...s.applications };
      delete next[id];
      return { ...s, applications: next };
    });
  },
};

export function useDispatch() {
  return useCallback((fn, ...args) => actions[fn](...args), []);
}
