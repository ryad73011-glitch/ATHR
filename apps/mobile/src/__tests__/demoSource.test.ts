jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { demoSource } from '../data/demoSource';

describe('demoSource battles', () => {
  it('returns live battles with two looks and sane percentages', async () => {
    const battles = await demoSource.listBattles({ status: 'live' });
    expect(battles.length).toBeGreaterThan(0);
    const r = await demoSource.getBattleResult(battles[0].id);
    expect(r).not.toBeNull();
    expect(r!.left_pct + r!.right_pct).toBe(100);
    expect(r!.left.items.length).toBeGreaterThan(0);
  });

  it('records a vote and shifts the tally', async () => {
    const battles = await demoSource.listBattles({ status: 'live' });
    const id = battles[0].id;
    const before = await demoSource.getBattleResult(id);
    const after = await demoSource.vote(id, 'right');
    expect(after.my_vote).toBe('right');
    expect(after.total_votes).toBe(before!.total_votes + 1);
  });

  it('changing a vote moves it between sides, not doubles it', async () => {
    const battles = await demoSource.listBattles({ status: 'live' });
    const id = battles[1].id;
    await demoSource.vote(id, 'left');
    const mid = await demoSource.getBattleResult(id);
    await demoSource.vote(id, 'right');
    const end = await demoSource.getBattleResult(id);
    expect(end!.total_votes).toBe(mid!.total_votes);
    expect(end!.my_vote).toBe('right');
  });
});

describe('demoSource saves & comments', () => {
  it('toggles save on and off', async () => {
    const looks = await demoSource.listLooks({ limit: 1 });
    const id = looks.items[0].id;
    const on = await demoSource.toggleSaveLook(id);
    expect(on).toBe(true);
    expect(await demoSource.isSaved(id)).toBe(true);
    const off = await demoSource.toggleSaveLook(id);
    expect(off).toBe(false);
  });

  it('adds a comment', async () => {
    const looks = await demoSource.listLooks({ limit: 1 });
    const id = looks.items[0].id;
    const c = await demoSource.addComment(id, 'Test comment');
    expect(c.body).toBe('Test comment');
    const list = await demoSource.listComments(id);
    expect(list.some((x) => x.id === c.id)).toBe(true);
  });
});

describe('demoSource studio', () => {
  it('answers from the local engine with real products', async () => {
    const res = await demoSource.runStudio({ occasion: 'evening', budget: 120000, currency: 'DZD', universes: ['CHAOS'], palette: [], note: '' });
    expect(res.engine).toBe('local-engine');
    expect(res.total_cost).toBeLessThanOrEqual(120000);
  });
});

describe('demoSource merchant reviews', () => {
  it('requires an approved store and enforces one editable rating per user', async () => {
    await demoSource.signIn('merchant-review-test@athr.demo', 'demo');
    try {
      const pendingStore = await demoSource.applyMerchant({
        name: 'Review Test Pending Store',
        city: 'Oran',
        description: 'Test fixture',
      });
      await expect(demoSource.addMerchantReview(pendingStore.id, 5, 'Too early')).rejects.toThrow(
        'Only approved stores can be rated.',
      );

      const approvedStores = await demoSource.listMerchants({ approvedOnly: true });
      expect(approvedStores.length).toBeGreaterThan(0);
      const store = approvedStores[0];
      const created = await demoSource.addMerchantReview(store.id, 4, 'Good service');
      expect(created.rating).toBe(4);
      await expect(demoSource.addMerchantReview(store.id, 3, 'Duplicate')).rejects.toThrow(
        'already rated this store',
      );

      const updated = await demoSource.updateMerchantReview(created.id, 5, 'Excellent');
      expect(updated.rating).toBe(5);
      expect(updated.comment).toBe('Excellent');
      const reviews = await demoSource.listMerchantReviews(store.id);
      expect(reviews.filter((review) => review.user_id === created.user_id)).toHaveLength(1);
      expect((await demoSource.getMerchant(store.id))?.rating).toBe(5);
    } finally {
      await demoSource.signOut();
    }
  });
});

