import {httpResolveClient} from '../ResolveClient.js';
import type {MiniappId} from '@dentvega/miniapp-contract';

afterEach(() => jest.restoreAllMocks());

function captureFetch(): string[] {
  const calls: string[] = [];
  (globalThis as unknown as {fetch: unknown}).fetch = jest.fn(async (url: string) => {
    calls.push(String(url));
    return {ok: true, json: async () => ({id: 'x', version: '0.0.0', url: 'u', manifest: {}})};
  });
  return calls;
}

describe('httpResolveClient — platform', () => {
  it('incluye &platform cuando el request lo trae', async () => {
    const calls = captureFetch();
    await httpResolveClient('http://b').resolve({id: 'x' as MiniappId, platform: 'ios'});
    expect(calls[0]).toContain('platform=ios');
  });

  it('omite platform cuando no viene', async () => {
    const calls = captureFetch();
    await httpResolveClient('http://b').resolve({id: 'x' as MiniappId});
    expect(calls[0]).not.toContain('platform=');
  });
});
