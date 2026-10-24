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

const emptyAccountState = {
  session: null,
  profile: null,
  prefs: null,
  contactDetails: null,
} as const;

async function loadAccountData(source: DataSource, userId: string) {
  const [profile, prefs, contactDetails] = await Promise.all([
    source.getProfile(userId),
    source.getPreferences(userId),
    source.getAccountContactDetails(userId),
  ]);

  return { profile, prefs, contactDetails };
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'boot',
  ...emptyAccountState,

  async init(source) {
    // Clear any previous identity before restoring persisted auth state.
    set({ status: 'boot', ...emptyAccountState });

    try {
      const session = await source.getSession();
      if (!session) {
        set({ status: 'anon', ...emptyAccountState });
        return;
      }

      // Bind the store to the restored identity before loading ancillary data.
      // If a profile/contact query fails, never leave another user's data visible.
      set({ status: 'authed', session, profile: null, prefs: null, contactDetails: null });
      const accountData = await loadAccountData(source, session.user_id);
      set({ status: 'authed', session, ...accountData });
    } catch {
      // Keep app startup deterministic; callers can retry initialization later.
      set({ status: 'anon', ...emptyAccountState });
    }
  },

  async signIn(source, email, password) {
    set({ status: 'boot', ...emptyAccountState });

    let session: AuthSession;
    try {
      session = await source.signIn(email, password);
    } catch (error) {
      set({ status: 'anon', ...emptyAccountState });
      throw error;
    }

    // Keep the newly authenticated identity, but clear all previous account data.
    set({ status: 'authed', session, profile: null, prefs: null, contactDetails: null });
    try {
      const accountData = await loadAccountData(source, session.user_id);
      set({ status: 'authed', session, ...accountData });
    } catch (error) {
      // Auth succeeded. Preserve that session, but do not expose stale account data.
      set({ status: 'authed', session, profile: null, prefs: null, contactDetails: null });
      throw error;
    }
  },

  async signUp(source, input) {
    set({ status: 'boot', ...emptyAccountState });

    let session: AuthSession;
    try {
      session = await source.signUp(input);
    } catch (error) {
      set({ status: 'anon', ...emptyAccountState });
      throw error;
    }

    set({ status: 'authed', session, profile: null, prefs: null, contactDetails: null });
    try {
      const accountData = await loadAccountData(source, session.user_id);
      set({ status: 'authed', session, ...accountData });
    } catch (error) {
      set({ status: 'authed', session, profile: null, prefs: null, contactDetails: null });
      throw error;
    }
  },

  async signOut(source) {
    try {
      await source.signOut();
    } finally {
      // Clear local private data even if the remote sign-out request fails.
      set({ status: 'anon', ...emptyAccountState });
    }
  },

  async refresh(source) {
    const { session } = get();
    if (!session) return;

    // Remove cached account details while refreshing so failed requests cannot
    // leave a stale profile/contact record on screen.
    set({ profile: null, prefs: null, contactDetails: null });
    try {
      const accountData = await loadAccountData(source, session.user_id);
      set({ profile: accountData.profile, prefs: accountData.prefs, contactDetails: accountData.contactDetails });
    } catch (error) {
      set({ profile: null, prefs: null, contactDetails: null });
      throw error;
    }
  },
}));
