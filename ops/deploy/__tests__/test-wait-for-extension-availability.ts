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

import * as ExtensionManagementInterfaces from 'azure-devops-node-api/interfaces/ExtensionManagementInterfaces';
import * as GalleryInterfaces from 'azure-devops-node-api/interfaces/GalleryInterfaces';

import {
  ExtensionClients,
  waitForExtensionAvailability,
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
