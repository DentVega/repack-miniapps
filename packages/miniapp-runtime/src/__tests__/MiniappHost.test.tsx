import React from 'react';
import {Text} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import type {
  CapabilityGrant,
  Manifest,
  MiniappId,
  ResolveResponse,
  SemVer,
} from '@dentvega/miniapp-contract';
import {MiniappHost, type MiniappHostRender} from '../MiniappHost.js';
import type {ResolveClient} from '../ResolveClient.js';
import type {MetricsClient, MetricEvent} from '../MetricsClient.js';
import type {ChunkLoader, EntryComponent} from '../ChunkLoader.js';
import type {HostProvided} from '../evaluate.js';

const ID = 'account_dashboard' as MiniappId;
const hostProvided: HostProvided = {
  react: '18.3.1' as SemVer,
  'react-native': '0.76.6' as SemVer,
};
const grant: CapabilityGrant = {granted: ['accounts:read'], isRevoked: () => false};
const compatibleShared = [
  {name: 'react-native', requiredRange: '^0.76.0', singleton: true},
];

function manifest(shared: Manifest['shared']): Manifest {
  return {
    id: ID,
    version: '0.1.0' as SemVer,
    entry: './Entry',
    shared,
    capabilities: ['accounts:read'],
  };
}
function resolvedWith(m: unknown): ResolveResponse {
  return {id: ID, version: '0.1.0' as SemVer, url: 'http://h/chunk', manifest: m as Manifest};
}
function mockResolve(resp: ResolveResponse | Error): ResolveClient {
  return {
    resolve: async () => {
      if (resp instanceof Error) throw resp;
      return resp;
    },
  };
}
function flakyResolve(failures: number, resp: ResolveResponse): ResolveClient {
  let n = 0;
  return {
    resolve: async () => {
      if (n++ < failures) throw new Error('resolve failed: transient');
      return resp;
    },
  };
}
const FakeEntry: EntryComponent = ({capabilities}) => (
  <Text>mounted: {capabilities.granted.join(',')}</Text>
);
const mockChunk: ChunkLoader = {load: async () => FakeEntry};
const skewed = manifest([{name: 'react-native', requiredRange: '^0.99.0', singleton: true}]);

function renderHost(
  client: ResolveClient,
  opts: {loader?: ChunkLoader; metrics?: MetricsClient; render?: MiniappHostRender} = {},
) {
  render(
    <MiniappHost
      id={ID}
      resolveClient={client}
      chunkLoader={opts.loader ?? mockChunk}
      hostProvided={hostProvided}
      capabilities={grant}
      metrics={opts.metrics}
      retry={{backoffMs: 0}}
      render={opts.render}
    />,
  );
}

describe('MiniappHost (headless, sin render)', () => {
  it('monta el Entry remoto con las capabilities', async () => {
    renderHost(mockResolve(resolvedWith(manifest(compatibleShared))));
    expect(await screen.findByText(/mounted: accounts:read/)).toBeOnTheScreen();
  });

  it('muestra el loading por defecto mientras resuelve', () => {
    renderHost({resolve: () => new Promise(() => {})});
    expect(screen.getByTestId('miniapp-loading')).toBeOnTheScreen();
  });

  it('fallback por defecto: header + mensaje en inglés + Retry', async () => {
    renderHost(mockResolve(new Error('resolve failed: down')));
    expect(await screen.findByText('We could not locate this miniapp.')).toBeOnTheScreen();
    expect(screen.getByRole('header', {name: 'Miniapp unavailable'})).toBeOnTheScreen();
    expect(screen.getByRole('button', {name: 'Retry'})).toBeOnTheScreen();
  });

  it('fallback permanente (skew) sin botón Retry', async () => {
    renderHost(mockResolve(resolvedWith(skewed)));
    expect(await screen.findByText(/not compatible/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', {name: 'Retry'})).toBeNull();
  });

  it('Retry manual recarga y monta', async () => {
    renderHost(flakyResolve(2, resolvedWith(manifest(compatibleShared))));
    fireEvent.press(await screen.findByRole('button', {name: 'Retry'}));
    expect(await screen.findByText(/mounted: accounts:read/)).toBeOnTheScreen();
  });

  it('reporta el fallback a métricas con la razón', async () => {
    const events: MetricEvent[] = [];
    renderHost(mockResolve(resolvedWith(skewed)), {metrics: {track: e => events.push(e)}});
    await screen.findByText(/not compatible/);
    expect(events).toContainEqual({type: 'fallback', id: ID, reason: 'skew'});
  });
});

describe('MiniappHost (render inyectado)', () => {
  it('usa el error del consumidor con reason y retryable', async () => {
    renderHost(mockResolve(new Error('resolve failed: down')), {
      render: {
        error: ({reason, retryable}) => (
          <Text>custom {reason} {String(retryable)}</Text>
        ),
      },
    });
    expect(await screen.findByText('custom resolve-failed true')).toBeOnTheScreen();
    expect(screen.queryByText('Miniapp unavailable')).toBeNull();
  });

  it('el onRetry del error inyectado recarga', async () => {
    renderHost(flakyResolve(2, resolvedWith(manifest(compatibleShared))), {
      render: {error: ({onRetry}) => <Text onPress={onRetry}>again</Text>},
    });
    fireEvent.press(await screen.findByText('again'));
    expect(await screen.findByText(/mounted: accounts:read/)).toBeOnTheScreen();
  });

  it('usa el loading del consumidor', () => {
    renderHost({resolve: () => new Promise(() => {})}, {
      render: {loading: ({retrying}) => <Text>cargando {String(retrying)}</Text>},
    });
    expect(screen.getByText('cargando false')).toBeOnTheScreen();
  });
});
