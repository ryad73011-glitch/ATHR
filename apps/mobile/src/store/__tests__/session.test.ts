import { useSession } from '../session';
import type { AuthSession, DataSource } from '../../data';
import type { AccountContactDetails, Profile, StylePreferences } from '../../data/types';

const activeSession: AuthSession = {
  user_id: 'user-new',
  email: 'new@example.test',
  access_token: 'test-token',
  mode: 'live',
};

const oldSession: AuthSession = {
  user_id: 'user-old',
  email: 'old@example.test',
  access_token: 'old-test-token',
  mode: 'live',
};

const oldProfile = { id: 'user-old', email: 'old@example.test' } as Profile;
const oldPrefs = { user_id: 'user-old' } as StylePreferences;
const oldContact = { user_id: 'user-old', phone: '000', wilaya: '', commune: '' } as AccountContactDetails;

function resetStore() {
  useSession.setState({
    status: 'boot',
    session: null,
    profile: null,
    prefs: null,
    contactDetails: null,
  });
}

function sourceWith(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'live',
    getSession: jest.fn().mockResolvedValue(null),
    signIn: jest.fn().mockResolvedValue(activeSession),
    signUp: jest.fn().mockResolvedValue(activeSession),
    signOut: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue({ id: 'user-new' }),
    getPreferences: jest.fn().mockResolvedValue({ user_id: 'user-new' }),
    getAccountContactDetails: jest.fn().mockResolvedValue({ user_id: 'user-new', phone: '', wilaya: '', commune: '' }),
    ...overrides,
  } as unknown as DataSource;
}

describe('useSession security state handling', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  it('clears the previous identity when authentication fails', async () => {
    useSession.setState({
      status: 'authed',
      session: oldSession,
      profile: oldProfile,
      prefs: oldPrefs,
      contactDetails: oldContact,
    });
    const source = sourceWith({
      signIn: jest.fn().mockRejectedValue(new Error('Invalid credentials')),
    });

    await expect(useSession.getState().signIn(source, 'bad@example.test', 'bad-password'))
      .rejects.toThrow('Invalid credentials');

    expect(useSession.getState()).toMatchObject({
      status: 'anon',
      session: null,
      profile: null,
      prefs: null,
      contactDetails: null,
    });
  });

  it('preserves the new auth session but never stale profile data if account loading fails', async () => {
    useSession.setState({
      status: 'authed',
      session: oldSession,
      profile: oldProfile,
      prefs: oldPrefs,
      contactDetails: oldContact,
    });
    const source = sourceWith({
      getProfile: jest.fn().mockRejectedValue(new Error('profile table unavailable')),
    });

    await expect(useSession.getState().signIn(source, activeSession.email, 'password'))
      .rejects.toThrow('profile table unavailable');

    expect(useSession.getState()).toMatchObject({
      status: 'authed',
      session: activeSession,
      profile: null,
      prefs: null,
      contactDetails: null,
    });
  });

  it('clears local private state even when remote sign-out fails', async () => {
    useSession.setState({
      status: 'authed',
      session: oldSession,
      profile: oldProfile,
      prefs: oldPrefs,
      contactDetails: oldContact,
    });
    const source = sourceWith({
      signOut: jest.fn().mockRejectedValue(new Error('network unavailable')),
    });

    await expect(useSession.getState().signOut(source)).rejects.toThrow('network unavailable');

    expect(useSession.getState()).toMatchObject({
      status: 'anon',
      session: null,
      profile: null,
      prefs: null,
      contactDetails: null,
    });
  });

  it('clears every account field if session restoration fails', async () => {
    useSession.setState({
      status: 'authed',
      session: oldSession,
      profile: oldProfile,
      prefs: oldPrefs,
      contactDetails: oldContact,
    });
    const source = sourceWith({
      getSession: jest.fn().mockRejectedValue(new Error('session storage unavailable')),
    });

    await useSession.getState().init(source);

    expect(useSession.getState()).toMatchObject({
      status: 'anon',
      session: null,
      profile: null,
      prefs: null,
      contactDetails: null,
    });
  });
});
