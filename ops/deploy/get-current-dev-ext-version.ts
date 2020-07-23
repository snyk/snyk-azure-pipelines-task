import { getExtensionInfo, getLatestVersion } from "./lib/azure-devops";

async function main() {
  const publisherName = process.env.DEV_AZ_PUBLISHER || "";
  // warning: the Marketplace stuff calls this extensionId - the rest of the extension stuff calls it name
  const extensionName = process.env.DEV_AZ_EXTENSION_ID || "";
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || "";

  const extensionDetails = await getExtensionInfo(
    azToken,
    publisherName,
    extensionName
  );

  if (extensionDetails) {
    const latestVersion = getLatestVersion(extensionDetails);
    if (latestVersion) {
      console.log(latestVersion);
    } else {
      console.error("could not get extension version info");
      process.exit(1);
    }
  } else {
    console.error("could not get extension info");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
