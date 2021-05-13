import { WebApi } from "azure-devops-node-api";

import { getAzUrl, getWebApi } from "./lib/azure-devops";
import {
  installExtension,
  getInstalledExtensionInfo
} from "./lib/azure-devops/extensions";

async function main() {
  const publisherName = process.env.DEV_AZ_PUBLISHER || "";
  // warning: the Marketplace stuff calls this extensionId - the rest of the extension stuff calls it name
  const extensionName = process.env.DEV_AZ_EXTENSION_ID || "";
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || "";
  const azOrg = process.env.DEV_AZ_ORG || "";

  const azUrl = getAzUrl(azOrg);
  const webApi: WebApi = await getWebApi(azUrl, azToken);

  try {
    const alreadyInstalledExtensionInfo = await getInstalledExtensionInfo(
      webApi,
      publisherName,
      extensionName
    );
    const alreadyInstalledVersion = alreadyInstalledExtensionInfo.version;
    console.log(
      `Extension version currently installed: ${alreadyInstalledVersion}`
    );

    console.log(
      "Attempting to install latest version of extension into org..."
    );
    // installExtension will throw an error if it is already installed
    const installRes = await installExtension(
      webApi,
      publisherName,
      extensionName
    );

    const afterInstallExtensionInfo = await getInstalledExtensionInfo(
      webApi,
      publisherName,
      extensionName
    );
    const afterInstallExtensionVersion = afterInstallExtensionInfo.version;
    console.log(`Extension version installed: ${afterInstallExtensionVersion}`);
  } catch (err) {
    console.log(`err.statusCode: ${err.statusCode}`);
    console.log(`err.message: ${err.message}`);
    throw err;
  }
}

if (require.main === module) {
  main();
}
