/*
 * Copyright 2022 Snyk Ltd.
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

import { getAzUrl, getWebApi } from './lib/azure-devops';
import {
  installExtension,
  getInstalledExtensionInfo,
  uninstallExtension,
} from './lib/azure-devops/extensions';
import { asyncSleep } from './lib/sleep';

async function main() {
  const publisherName = process.env.DEV_AZ_PUBLISHER || '';
  // warning: the Marketplace stuff calls this extensionId - the rest of the extension stuff calls it name
  const extensionName = process.env.DEV_AZ_EXTENSION_ID || '';
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || '';
  const azOrg = process.env.DEV_AZ_ORG || '';

  const version = process.argv[2];
  if (version) {
    console.log(`going to try to install extesion version: ${version}`);
  } else {
    console.log('version must be passed in');
    process.exit(1);
  }

  const azUrl = getAzUrl(azOrg);
  const webApi: WebApi = await getWebApi(azUrl, azToken);

  try {
    const alreadyInstalledExtensionInfo = await getInstalledExtensionInfo(
      webApi,
      publisherName,
      extensionName,
    );

    if (alreadyInstalledExtensionInfo) {
      const alreadyInstalledVersion = alreadyInstalledExtensionInfo.version;
      console.log(
        `Extension version currently installed: ${alreadyInstalledVersion}`,
      );

      console.log(`Uninstalling previously installed extension`);
      await uninstallExtension(webApi, publisherName, extensionName);
    }

    console.log(
      'Attempting to install latest version of extension into org...',
    );
    // installExtension will throw an error if it is already installed
    await installExtension(webApi, publisherName, extensionName, version);

    const afterInstallExtensionInfo = await getInstalledExtensionInfo(
      webApi,
      publisherName,
      extensionName,
    );
    const afterInstallExtensionVersion = afterInstallExtensionInfo.version;
    console.log(`Extension version installed: ${afterInstallExtensionVersion}`);

    // there seems to be a delay between when the API indicates the extension is available and when a Pipeline
    // can be succesfully launched that uses it.
    // so, we will sleep for 30 seconds to give it some time to sort itself out
    console.log(
      'sleeping for 30 seconds to give Azure DevOps time to settle extension availability',
    );
    await asyncSleep(30000);
    console.log('done sleeping for 30 seconds');
  } catch (err) {
    console.log(`err.statusCode: ${err.statusCode}`);
    console.log(`err.message: ${err.message}`);
    throw err;
  }
}

if (require.main === module) {
  main();
}
