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

import * as GalleryInterfaces from 'azure-devops-node-api/interfaces/GalleryInterfaces';

import { getExtensionInfo, getWebApi } from '../lib/azure-devops';
import { getInstalledExtensionInfo } from '../lib/azure-devops/extensions';
import { asyncSleep } from '../lib/sleep';
import { main } from '../wait-for-extension-availability';

jest.mock('../lib/azure-devops');
jest.mock('../lib/azure-devops/extensions');
jest.mock('../lib/sleep');

const expectedVersion = '1.2.3';

beforeEach(() => {
  jest.resetAllMocks();
  process.argv[2] = expectedVersion;
  (getWebApi as jest.Mock).mockResolvedValue({});
  (getExtensionInfo as jest.Mock).mockResolvedValue({
    versions: [
      {
        version: expectedVersion,
        flags: GalleryInterfaces.ExtensionVersionFlags.Validated,
      },
    ],
  });
  (getInstalledExtensionInfo as jest.Mock).mockResolvedValue({
    version: expectedVersion,
  });
  (asyncSleep as jest.Mock).mockResolvedValue(undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

test('waits 60 seconds after the org reports the expected version before returning', async () => {
  await main();

  expect(asyncSleep).toHaveBeenCalledTimes(1);
  expect(asyncSleep).toHaveBeenCalledWith(60000);
  expect(
    (getInstalledExtensionInfo as jest.Mock).mock.invocationCallOrder[0],
  ).toBeLessThan((asyncSleep as jest.Mock).mock.invocationCallOrder[0]);
});
