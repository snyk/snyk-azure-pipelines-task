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

import { getExtensionInfo, getLatestVersion } from './lib/azure-devops';

async function main() {
  const publisherName = process.env.DEV_AZ_PUBLISHER || '';
  // warning: the Marketplace stuff calls this extensionId - the rest of the extension stuff calls it name
  const extensionName = process.env.DEV_AZ_EXTENSION_ID || '';
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || '';

  const extensionDetails = await getExtensionInfo(
    azToken,
    publisherName,
    extensionName,
  );

  if (extensionDetails) {
    const latestVersion = getLatestVersion(extensionDetails);
    if (latestVersion) {
      console.log(latestVersion);
    } else {
      console.error('could not get extension version info');
      process.exit(1);
    }
  } else {
    console.error('could not get extension info');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
