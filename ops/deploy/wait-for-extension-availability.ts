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

import { WebApi } from 'azure-devops-node-api';

import { getAzUrl, getExtensionInfo, getWebApi } from './lib/azure-devops';
import {
  installedVersionStatus,
  marketplaceVersionStatus,
} from './lib/azure-devops/extension-status';
import { getInstalledExtensionInfo } from './lib/azure-devops/extensions';
import { PollOptions, pollUntilReady, ProbeResult } from './lib/poll';

const POLL_OPTIONS: PollOptions = {
  intervalMs: 2 * 60 * 1000,
  timeoutMs: 10 * 60 * 1000,
};

/**
 * `tfx extension publish --no-wait-validation` returns as soon as the package
 * is uploaded, so nothing else in the deploy confirms that the new version was
 * validated by the Marketplace and picked up by the dev org. Without this gate
 * the test pipelines silently run against the previously installed version.
 */
async function main() {
  const publisherName = process.env.DEV_AZ_PUBLISHER || '';
  // warning: the Marketplace stuff calls this extensionId - the rest of the extension stuff calls it name
  const extensionName = process.env.DEV_AZ_EXTENSION_ID || '';
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || '';
  const azOrg = process.env.DEV_AZ_ORG || '';

  const expectedVersion = process.argv[2];
  if (!expectedVersion) {
    console.error('version must be passed in');
    process.exit(1);
  }

  console.log(`Waiting for extension version ${expectedVersion}`);

  await pollUntilReady(
    'Marketplace validation',
    async (): Promise<ProbeResult> => {
      try {
        const extensionDetails = await getExtensionInfo(
          azToken,
          publisherName,
          extensionName,
        );
        return marketplaceVersionStatus(extensionDetails, expectedVersion);
      } catch (err) {
        return {
          status: 'pending',
          detail: `could not read the Marketplace extension info: ${err.message}`,
        };
      }
    },
    POLL_OPTIONS,
  );

  const webApi: WebApi = await getWebApi(getAzUrl(azOrg), azToken);

  await pollUntilReady(
    `Rollout to org ${azOrg}`,
    async (): Promise<ProbeResult> => {
      try {
        const installedExtension = await getInstalledExtensionInfo(
          webApi,
          publisherName,
          extensionName,
        );
        return installedVersionStatus(installedExtension, expectedVersion);
      } catch (err) {
        // the API returns an error while the org has no installed extension to report on
        return {
          status: 'pending',
          detail: `could not read the installed extension info: ${err.message}`,
        };
      }
    },
    POLL_OPTIONS,
  );

  console.log(`Extension version ${expectedVersion} is ready to be tested`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
