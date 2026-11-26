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

import { getAzUrl, getExtensionInfo, getWebApi } from './lib/azure-devops';
import {
  getBuild,
  getBuildLogLines,
  queueBuild,
} from './lib/azure-devops/builds';
import {
  installedVersionStatus,
  marketplaceVersionStatus,
} from './lib/azure-devops/extension-status';
import { probeBuildTaskVersionStatus } from './lib/azure-devops/task-version-status';
import {
  getInstalledExtensionInfo,
  installExtension,
} from './lib/azure-devops/extensions';
import { PollOptions, pollUntilReady, ProbeResult } from './lib/poll';

export interface ExtensionClients {
  getMarketplaceExtension: () => Promise<
    GalleryInterfaces.PublishedExtension | undefined
  >;
  getInstalledExtension: () => Promise<
    ExtensionManagementInterfaces.InstalledExtension | undefined
  >;
  installExtension: (version: string) => Promise<void>;
}

export interface ProbeBuildClients {
  queueProbeBuild: () => Promise<BuildInterfaces.Build>;
  getProbeBuild: (buildId: number) => Promise<BuildInterfaces.Build>;
  getProbeBuildLogLines: (buildId: number) => Promise<string[]>;
}

const POLL_OPTIONS: PollOptions = {
  intervalMs: 2 * 60 * 1000,
  timeoutMs: 10 * 60 * 1000,
};

const PROBE_POLL_OPTIONS: PollOptions = {
  intervalMs: 30 * 1000,
  timeoutMs: 10 * 60 * 1000,
};

const PROBE_BUILD = {
  projectName: 'snyk-6598',
  buildDefinitionId: 17,
};

/**
 * `tfx extension publish --no-wait-validation` returns as soon as the package
 * is uploaded, so nothing else in the deploy confirms that the new version was
 * validated by the Marketplace and picked up by the dev org. Without this gate
 * the test pipelines silently run against the previously installed version.
 */
export async function waitForExtensionAvailability(
  azure: ExtensionClients,
  expectedVersion: string,
  options: PollOptions,
): Promise<void> {
  await pollUntilReady(
    'Marketplace validation',
    async (): Promise<ProbeResult> => {
      try {
        const extensionDetails = await azure.getMarketplaceExtension();
        return marketplaceVersionStatus(extensionDetails, expectedVersion);
      } catch (err) {
        return {
          status: 'pending',
          detail: `could not read the Marketplace extension info: ${err.message}`,
        };
      }
    },
    options,
  );

  await pollUntilReady(
    'Rollout to org',
    async (): Promise<ProbeResult> => {
      let installedExtension:
        | ExtensionManagementInterfaces.InstalledExtension
        | undefined;
      try {
        installedExtension = await azure.getInstalledExtension();
      } catch (err) {
        return {
          status: 'pending',
          detail: `could not read the installed extension info: ${err.message}`,
        };
      }

      // An org that already has an older version is left to auto-update; only
      // an org without the extension at all would otherwise never get it.
      if (!installedExtension) {
        await azure.installExtension(expectedVersion);
        return {
          status: 'pending',
          detail: `installed version ${expectedVersion}, waiting for the org to report it`,
        };
      }

      return installedVersionStatus(installedExtension, expectedVersion);
    },
    options,
  );
}

/**
 * The org can report the new extension version as installed while pipelines
 * still download the previous task version, so only a real build shows which
 * version the test pipelines will run.
 */
export async function waitForResolvedTaskVersion(
  azure: ProbeBuildClients,
  taskName: string,
  expectedVersion: string,
  options: PollOptions,
): Promise<void> {
  let probeBuildId: number | undefined;

  await pollUntilReady(
    'Task resolution in pipelines',
    async (): Promise<ProbeResult> => {
      let detail = '';

      if (probeBuildId !== undefined) {
        let result: ProbeResult;
        try {
          const build = await azure.getProbeBuild(probeBuildId);
          if (build.status !== BuildInterfaces.BuildStatus.Completed) {
            return {
              status: 'pending',
              detail: `waiting for probe build ${probeBuildId} to complete`,
            };
          }
          const logLines = await azure.getProbeBuildLogLines(probeBuildId);
          result = probeBuildTaskVersionStatus(
            build,
            logLines,
            taskName,
            expectedVersion,
          );
        } catch (err) {
          return {
            status: 'pending',
            detail: `could not read probe build ${probeBuildId}: ${err.message}`,
          };
        }
        if (result.status === 'ready') {
          return result;
        }
        detail = `${result.detail}; `;
      }

      try {
        probeBuildId = (await azure.queueProbeBuild()).id;
      } catch (err) {
        probeBuildId = undefined;
        return {
          status: 'pending',
          detail: `${detail}could not queue a probe build: ${err.message}`,
        };
      }
      return {
        status: 'pending',
        detail: `${detail}queued probe build ${probeBuildId}`,
      };
    },
    options,
  );
}

async function main() {
  const publisherName = process.env.DEV_AZ_PUBLISHER || '';
  // warning: the Marketplace stuff calls this extensionId - the rest of the extension stuff calls it name
  const extensionName = process.env.DEV_AZ_EXTENSION_ID || '';
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || '';
  const azOrg = process.env.DEV_AZ_ORG || '';
  const taskName = process.env.DEV_AZ_TASK_NAME || '';

  const expectedVersion = process.argv[2];
  if (!expectedVersion) {
    console.error('version must be passed in');
    process.exit(1);
  }

  console.log(
    `Waiting for extension version ${expectedVersion} in org ${azOrg}`,
  );

  const webApi = await getWebApi(getAzUrl(azOrg), azToken);

  await waitForExtensionAvailability(
    {
      getMarketplaceExtension: () =>
        getExtensionInfo(azToken, publisherName, extensionName),
      getInstalledExtension: () =>
        getInstalledExtensionInfo(webApi, publisherName, extensionName),
      installExtension: async (version) => {
        await installExtension(webApi, publisherName, extensionName, version);
      },
    },
    expectedVersion,
    POLL_OPTIONS,
  );

  await waitForResolvedTaskVersion(
    {
      queueProbeBuild: () =>
        queueBuild(webApi, PROBE_BUILD.projectName, {
          definition: { id: PROBE_BUILD.buildDefinitionId },
        }),
      getProbeBuild: (buildId) =>
        getBuild(webApi, PROBE_BUILD.projectName, buildId),
      getProbeBuildLogLines: (buildId) =>
        getBuildLogLines(webApi, PROBE_BUILD.projectName, buildId),
    },
    taskName,
    expectedVersion,
    PROBE_POLL_OPTIONS,
  );

  console.log(`Extension version ${expectedVersion} is ready to be tested`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
