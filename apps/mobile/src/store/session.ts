import { create } from 'zustand';

import type { AuthSession, DataSource } from '../data';
import type { AccountContactDetails, Profile, StylePreferences } from '../data/types';

interface SessionState {
  status: 'boot' | 'authed' | 'anon';
  session: AuthSession | null;
  profile: Profile | null;
  prefs: StylePreferences | null;
  contactDetails: AccountContactDetails | null;
  init: (source: DataSource) => Promise<void>;
  signIn: (source: DataSource, email: string, password: string) => Promise<void>;
  signUp: (source: DataSource, input: { email: string; password: string; handle: string; display_name: string; phone: string; wilaya: string; commune: string }) => Promise<void>;
  signOut: (source: DataSource) => Promise<void>;
  refresh: (source: DataSource) => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'boot',
  session: null,
  profile: null,
  prefs: null,
  contactDetails: null,

  async init(source) {
    try {
      const session = await source.getSession();
      if (session) {
        const [profile, prefs, contactDetails] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id), source.getAccountContactDetails(session.user_id)]);
        set({ status: 'authed', session, profile, prefs, contactDetails });
      } else {
        set({ status: 'anon', session: null, profile: null, prefs: null, contactDetails: null });
      }
    } catch {
      // Never leave a stale authenticated identity or private data in memory
      // when session restoration or any required account query fails.
      set({ status: 'anon', session: null, profile: null, prefs: null, contactDetails: null });
    }
  },

  async signIn(source, email, password) {
    const session = await source.signIn(email, password);
    const [profile, prefs, contactDetails] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id), source.getAccountContactDetails(session.user_id)]);
    set({ status: 'authed', session, profile, prefs, contactDetails });
  },

  async signUp(source, input) {
    const session = await source.signUp(input);
    const [profile, prefs, contactDetails] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id), source.getAccountContactDetails(session.user_id)]);
    set({ status: 'authed', session, profile, prefs, contactDetails });
  },

  async signOut(source) {
    try {
      await source.signOut();
    } finally {
      // Clear private client state even if the network sign-out request fails.
      // The next session initialization must revalidate the server session.
      set({ status: 'anon', session: null, profile: null, prefs: null, contactDetails: null });
    }
  },

  async refresh(source) {
    const { session } = get();
    if (!session) return;
    const [profile, prefs, contactDetails] = await Promise.all([source.getProfile(session.user_id), source.getPreferences(session.user_id), source.getAccountContactDetails(session.user_id)]);
    set({ profile, prefs, contactDetails });
  },
}));
