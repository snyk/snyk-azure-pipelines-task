/*
 * Copyright 2026 Snyk Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';
import * as ExtensionManagementInterfaces from 'azure-devops-node-api/interfaces/ExtensionManagementInterfaces';
import * as GalleryInterfaces from 'azure-devops-node-api/interfaces/GalleryInterfaces';

import {
  ExtensionClients,
  ProbeBuildClients,
  waitForExtensionAvailability,
  waitForResolvedTaskVersion,
} from '../wait-for-extension-availability';
import { PollOptions } from '../lib/poll';

const validated = GalleryInterfaces.ExtensionVersionFlags.Validated;

function publishedWithValidated(
  version: string,
): GalleryInterfaces.PublishedExtension {
  return {
    versions: [{ version, flags: validated }],
  } as GalleryInterfaces.PublishedExtension;
}

function installed(
  version: string,
): ExtensionManagementInterfaces.InstalledExtension {
  return { version } as ExtensionManagementInterfaces.InstalledExtension;
}

/**
 * A fake org whose installed version only changes when the deploy installs
 * the extension or when `autoUpdateTo` is called, so tests can tell the two
 * apart.
 */
function fakeOrg(initiallyInstalled: string | undefined) {
  let installedVersion = initiallyInstalled;
  const events: string[] = [];

  const clients: ExtensionClients = {
    getMarketplaceExtension: async () => publishedWithValidated('1.2.3'),
    getInstalledExtension: async () => {
      events.push(`read installed ${installedVersion}`);
      return installedVersion ? installed(installedVersion) : undefined;
    },
    installExtension: jest.fn(async (version: string) => {
      events.push(`install ${version}`);
      installedVersion = version;
    }),
  };

  return {
    clients,
    events,
    autoUpdateTo: (version: string) => {
      installedVersion = version;
    },
  };
}

function testOptions(
  events: string[],
  overrides: Partial<PollOptions> = {},
): PollOptions {
  let clock = 0;
  return {
    intervalMs: 1000,
    timeoutMs: 10000,
    now: () => clock,
    sleep: async (milliseconds) => {
      events.push(`sleep ${milliseconds}`);
      clock += milliseconds;
    },
    log: () => undefined,
    ...overrides,
  };
}

test('installs the expected version when the org does not have the extension', async () => {
  const org = fakeOrg(undefined);

  await waitForExtensionAvailability(
    org.clients,
    '1.2.3',
    testOptions(org.events),
  );

  expect(org.clients.installExtension).toHaveBeenCalledWith('1.2.3');
  expect(org.events).toContain('read installed 1.2.3');
});

test('leaves an org with an older version to auto-update instead of installing', async () => {
  const org = fakeOrg('1.2.2');
  let sleeps = 0;
  const options = testOptions(org.events, {
    sleep: async () => {
      sleeps += 1;
      if (sleeps === 2) {
        org.autoUpdateTo('1.2.3');
      }
    },
  });

  await waitForExtensionAvailability(org.clients, '1.2.3', options);

  expect(org.clients.installExtension).not.toHaveBeenCalled();
  expect(org.events).toContain('read installed 1.2.2');
  expect(org.events).toContain('read installed 1.2.3');
});

test('returns as soon as the org reports the expected version', async () => {
  const org = fakeOrg('1.2.3');

  await waitForExtensionAvailability(
    org.clients,
    '1.2.3',
    testOptions(org.events),
  );

  expect(org.events).toEqual(['read installed 1.2.3']);
});

interface ProbeRun {
  resolvedVersion?: string;
  result?: BuildInterfaces.BuildResult;
  inProgressChecks?: number;
}

function downloads(resolvedVersion: string): ProbeRun {
  return { resolvedVersion };
}

/**
 * A fake probe pipeline whose nth queued build is described by the nth of
 * `runs`.
 */
function fakeProbePipeline(runs: ProbeRun[]) {
  const events: string[] = [];
  let queuedBuilds = 0;
  const run = (buildId: number) => runs[buildId - 1];

  const clients: ProbeBuildClients = {
    queueProbeBuild: async () => {
      queuedBuilds += 1;
      events.push(`queue build ${queuedBuilds}`);
      return { id: queuedBuilds };
    },
    getProbeBuild: async (buildId) => {
      const probeRun = run(buildId);
      if (probeRun.inProgressChecks) {
        probeRun.inProgressChecks -= 1;
        return { id: buildId, status: BuildInterfaces.BuildStatus.InProgress };
      }
      return {
        id: buildId,
        status: BuildInterfaces.BuildStatus.Completed,
        result: probeRun.result || BuildInterfaces.BuildResult.Succeeded,
      };
    },
    getProbeBuildLogLines: async (buildId) =>
      run(buildId).resolvedVersion
        ? [
            `2026-11-26T10:00:00.0000000Z Downloading task: DevSnykSecurityScan (${
              run(buildId).resolvedVersion
            })`,
          ]
        : [],
  };

  return { clients, events };
}

describe('waitForResolvedTaskVersion', () => {
  test('keeps queueing probe builds until one downloads the expected version', async () => {
    const pipeline = fakeProbePipeline([
      downloads('1.2.2'),
      downloads('1.2.3'),
    ]);

    await waitForResolvedTaskVersion(
      pipeline.clients,
      'DevSnykSecurityScan',
      '1.2.3',
      testOptions(pipeline.events),
    );

    expect(pipeline.events).toEqual([
      'queue build 1',
      'sleep 1000',
      'queue build 2',
      'sleep 1000',
    ]);
  });

  test('times out naming the expected and resolved versions when the probe never catches up', async () => {
    const pipeline = fakeProbePipeline(Array(20).fill(downloads('1.2.2')));

    await expect(
      waitForResolvedTaskVersion(
        pipeline.clients,
        'DevSnykSecurityScan',
        '1.2.3',
        testOptions(pipeline.events),
      ),
    ).rejects.toThrow(
      'Task resolution in pipelines timed out after 10000ms. Last status: probe build 10 downloaded DevSnykSecurityScan 1.2.2, waiting for 1.2.3',
    );
  });

  test('treats a failed probe build as pending and queues another', async () => {
    const pipeline = fakeProbePipeline([
      { resolvedVersion: '1.2.3', result: BuildInterfaces.BuildResult.Failed },
      downloads('1.2.3'),
    ]);
    const logged: string[] = [];

    await waitForResolvedTaskVersion(
      pipeline.clients,
      'DevSnykSecurityScan',
      '1.2.3',
      testOptions(pipeline.events, { log: (message) => logged.push(message) }),
    );

    expect(pipeline.events).toContain('queue build 2');
    expect(logged).toContainEqual(
      expect.stringContaining('probe build 1 finished with result Failed'),
    );
  });

  test('treats a probe build whose logs do not name the task as pending', async () => {
    const pipeline = fakeProbePipeline([{}, downloads('1.2.3')]);
    const logged: string[] = [];

    await waitForResolvedTaskVersion(
      pipeline.clients,
      'DevSnykSecurityScan',
      '1.2.3',
      testOptions(pipeline.events, { log: (message) => logged.push(message) }),
    );

    expect(pipeline.events).toContain('queue build 2');
    expect(logged).toContainEqual(
      expect.stringContaining(
        'probe build 1 logs do not show which DevSnykSecurityScan version was downloaded',
      ),
    );
  });

  test('treats an error reading the probe build as pending', async () => {
    const pipeline = fakeProbePipeline([
      downloads('1.2.3'),
      downloads('1.2.3'),
    ]);
    pipeline.clients.getProbeBuildLogLines = jest
      .fn()
      .mockRejectedValueOnce(new Error('log not found'))
      .mockResolvedValue([
        '2026-11-26T10:00:00.0000000Z Downloading task: DevSnykSecurityScan (1.2.3)',
      ]);
    const logged: string[] = [];

    await waitForResolvedTaskVersion(
      pipeline.clients,
      'DevSnykSecurityScan',
      '1.2.3',
      testOptions(pipeline.events, { log: (message) => logged.push(message) }),
    );

    expect(logged).toContainEqual(
      expect.stringContaining('could not read probe build 1: log not found'),
    );
  });

  test('treats an error queueing the probe build as pending', async () => {
    const pipeline = fakeProbePipeline([downloads('1.2.3')]);
    const queueProbeBuild = pipeline.clients.queueProbeBuild;
    pipeline.clients.queueProbeBuild = jest
      .fn()
      .mockRejectedValueOnce(new Error('definition is disabled'))
      .mockImplementation(queueProbeBuild);
    const logged: string[] = [];

    await waitForResolvedTaskVersion(
      pipeline.clients,
      'DevSnykSecurityScan',
      '1.2.3',
      testOptions(pipeline.events, { log: (message) => logged.push(message) }),
    );

    expect(logged).toContainEqual(
      expect.stringContaining(
        'could not queue a probe build: definition is disabled',
      ),
    );
  });

  test('waits for a running probe build instead of queueing another', async () => {
    const pipeline = fakeProbePipeline([
      { resolvedVersion: '1.2.3', inProgressChecks: 1 },
    ]);

    await waitForResolvedTaskVersion(
      pipeline.clients,
      'DevSnykSecurityScan',
      '1.2.3',
      testOptions(pipeline.events),
    );

    expect(pipeline.events).toEqual([
      'queue build 1',
      'sleep 1000',
      'sleep 1000',
    ]);
  });
});
