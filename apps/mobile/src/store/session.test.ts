import { useSession } from './session';
import type { DataSource } from '../data';

const expectPrivateStateCleared = () => {
  expect(useSession.getState()).toMatchObject({
    status: 'anon',
    session: null,
    profile: null,
    prefs: null,
    contactDetails: null,
  });
};

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

    expectPrivateStateCleared();
  });

  it('clears private data even when server sign-out fails', async () => {
    const source = {
      signOut: jest.fn().mockRejectedValue(new Error('network unavailable')),
    } as unknown as DataSource;

    await expect(useSession.getState().signOut(source)).rejects.toThrow('network unavailable');

    expectPrivateStateCleared();
  });

  it('clears stale private data if sign-in succeeds but account loading fails', async () => {
    const source = {
      signIn: jest.fn().mockResolvedValue({ user_id: 'user-b' }),
      getProfile: jest.fn().mockRejectedValue(new Error('profile unavailable')),
      getPreferences: jest.fn(),
      getAccountContactDetails: jest.fn(),
    } as unknown as DataSource;

    await expect(useSession.getState().signIn(source, 'b@example.test', 'not-a-real-password'))
      .rejects.toThrow('profile unavailable');

    expectPrivateStateCleared();
  });

  it('clears stale private data if sign-up succeeds but account loading fails', async () => {
    const source = {
      signUp: jest.fn().mockResolvedValue({ user_id: 'user-b' }),
      getProfile: jest.fn().mockResolvedValue({ id: 'user-b' }),
      getPreferences: jest.fn().mockRejectedValue(new Error('preferences unavailable')),
      getAccountContactDetails: jest.fn(),
    } as unknown as DataSource;

    await expect(useSession.getState().signUp(source, {
      email: 'b@example.test',
      password: 'not-a-real-password',
      handle: 'user-b',
      display_name: 'User B',
      phone: '',
      wilaya: '',
      commune: '',
    })).rejects.toThrow('preferences unavailable');

    expectPrivateStateCleared();
  });

  it('clears private data and propagates refresh errors', async () => {
    const source = {
      getProfile: jest.fn().mockResolvedValue({ id: 'user-a' }),
      getPreferences: jest.fn().mockRejectedValue(new Error('preferences unavailable')),
      getAccountContactDetails: jest.fn(),
    } as unknown as DataSource;

    await expect(useSession.getState().refresh(source)).rejects.toThrow('preferences unavailable');

    expectPrivateStateCleared();
  });
});
