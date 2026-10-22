import { useSession } from './session';
import type { DataSource } from '../data';

describe('session private-state cleanup', () => {
  beforeEach(() => {
    useSession.setState({
      status: 'authed',
      session: { user_id: 'user-a' } as never,
      profile: { id: 'user-a', email: 'private@example.test' } as never,
      prefs: {} as never,
      contactDetails: { user_id: 'user-a', phone: 'private' } as never,
    });
  });

  it('clears stale private data when session restoration fails', async () => {
    const source = {
      getSession: jest.fn().mockResolvedValue({ user_id: 'user-a' }),
      getProfile: jest.fn().mockRejectedValue(new Error('network unavailable')),
      getPreferences: jest.fn(),
      getAccountContactDetails: jest.fn(),
    } as unknown as DataSource;

    await useSession.getState().init(source);

    expect(useSession.getState()).toMatchObject({
      status: 'anon',
      session: null,
      profile: null,
      prefs: null,
      contactDetails: null,
    });
  });

  it('clears private data even when server sign-out fails', async () => {
    const source = {
      signOut: jest.fn().mockRejectedValue(new Error('network unavailable')),
    } as unknown as DataSource;

    await expect(useSession.getState().signOut(source)).rejects.toThrow('network unavailable');

    expect(useSession.getState()).toMatchObject({
      status: 'anon',
      session: null,
      profile: null,
      prefs: null,
      contactDetails: null,
    });
  });
});
