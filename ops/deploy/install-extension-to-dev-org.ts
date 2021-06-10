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
    const alreadyInstalledVersion = alreadyInstalledExtensionInfo.version;
    console.log(
      `Extension version currently installed: ${alreadyInstalledVersion}`,
    );

    console.log(`Uninstalling previously installed extension`);
    await uninstallExtension(webApi, publisherName, extensionName);

    console.log(
      'Attempting to install latest version of extension into org...',
    );
    // installExtension will throw an error if it is already installed
    const installRes = await installExtension(
      webApi,
      publisherName,
      extensionName,
      version,
    );

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
