import {parseDevRemotes, devResolveClient} from '../devResolveClient.js';
import type {ResolveClient} from '../ResolveClient.js';

describe('parseDevRemotes', () => {
  it('parses id=url pairs', () => {
    expect(parseDevRemotes('a=http://localhost:9000,b=http://localhost:9100')).toEqual({
      a: 'http://localhost:9000',
      b: 'http://localhost:9100',
    });
  });
  it('returns {} for empty/whitespace', () => {
    expect(parseDevRemotes('')).toEqual({});
    expect(parseDevRemotes('   ')).toEqual({});
  });
  it('ignores malformed entries (no =)', () => {
    expect(parseDevRemotes('a=http://x,garbage,b=http://y')).toEqual({
      a: 'http://x',
      b: 'http://y',
    });
  });
});

describe('devResolveClient', () => {
  const base = 'http://localhost:3999';
  it('resolves a dev-remote id to its :9000 container url, no integrity', async () => {
    const client = devResolveClient(base, {cards_wallet: 'http://localhost:9000'});
    const res = await client.resolve({id: 'cards_wallet' as never});
    expect(res.url).toBe('http://localhost:9000/cards_wallet.container.js.bundle?platform=android');
    expect(res.manifest.integrity).toBeUndefined();
    expect(res.id).toBe('cards_wallet');
  });
  it('usa la plataforma del request en la dev url', async () => {
    const client = devResolveClient(base, {cards_wallet: 'http://localhost:9000'});
    const res = await client.resolve({id: 'cards_wallet' as never, platform: 'ios'});
    expect(res.url).toBe('http://localhost:9000/cards_wallet.container.js.bundle?platform=ios');
  });
  it('delegates non-dev ids to the wrapped HTTP client', async () => {
    const delegate: ResolveClient = {resolve: jest.fn(async () => ({looked: 'up'} as never))};
    const client = devResolveClient(base, {cards_wallet: 'http://localhost:9000'}, delegate);
    const out = await client.resolve({id: 'account_dashboard' as never});
    expect(delegate.resolve).toHaveBeenCalledWith({id: 'account_dashboard'});
    expect(out).toEqual({looked: 'up'});
  });
});
