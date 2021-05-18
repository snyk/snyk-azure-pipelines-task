import { WebApi } from "azure-devops-node-api";
import * as ExtensionManagementApi from "azure-devops-node-api/ExtensionManagementApi";
import * as ExtensionManagementInterfaces from "azure-devops-node-api/interfaces/ExtensionManagementInterfaces";

export async function getInstalledExtensionInfo(
  webApi: WebApi,
  publisherName: string,
  extensionId: string
): Promise<ExtensionManagementInterfaces.InstalledExtension> {
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  // Will throw error if already installed
  return extensionManagementApiObject.getInstalledExtensionByName(
    publisherName,
    extensionId
  );
}

export async function uninstallExtension(
  webApi: WebApi,
  publisherName: string,
  extensionId: string
): Promise<void> {
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.uninstallExtensionByName(
    publisherName,
    extensionId
  );
}

export async function installExtension(
  webApi: WebApi,
  publisherName: string,
  extensionId: string,
  version?: string
): Promise<ExtensionManagementInterfaces.InstalledExtension> {
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.installExtensionByName(
    publisherName,
    extensionId,
    version
  );
}
