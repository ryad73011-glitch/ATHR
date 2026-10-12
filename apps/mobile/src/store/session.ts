import { create } from 'zustand';

import type { AuthSession, DataSource } from '../data';
import type { Profile, StylePreferences } from '../data/types';

interface SessionState {
  status: 'boot' | 'authed' | 'anon';
  session: AuthSession | null;
  profile: Profile | null;
  prefs: StylePreferences | null;
  init: (source: DataSource) => Promise<void>;
  signIn: (source: DataSource, email: string, password: string) => Promise<void>;
  signUp: (source: DataSource, input: { email: string; password: string; handle: string; display_name: string }) => Promise<void>;
  signOut: (source: DataSource) => Promise<void>;
  refresh: (source: DataSource) => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'boot',
  session: null,
  profile: null,
  prefs: null,

  async init(source) {
    try {
      const session = await source.getSession();
      if (session) {
        const [profile, prefs] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id)]);
        set({ status: 'authed', session, profile, prefs });
      } else {
        set({ status: 'anon', session: null, profile: null, prefs: null });
      }
    } catch {
      set({ status: 'anon' });
    }
  },

  async signIn(source, email, password) {
    const session = await source.signIn(email, password);
    const [profile, prefs] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id)]);
    set({ status: 'authed', session, profile, prefs });
  },

  async signUp(source, input) {
    const session = await source.signUp(input);
    const [profile, prefs] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id)]);
    set({ status: 'authed', session, profile, prefs });
  },

  async signOut(source) {
    await source.signOut();
    set({ status: 'anon', session: null, profile: null, prefs: null });
  },

  async refresh(source) {
    const { session } = get();
    if (!session) return;
    const [profile, prefs] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id)]);
    set({ profile, prefs });
  },
}));
