import * as nodeApi from "azure-devops-node-api";
import * as ExtensionManagementApi from "azure-devops-node-api/ExtensionManagementApi";
import * as ExtensionManagementInterfaces from "azure-devops-node-api/interfaces/ExtensionManagementInterfaces";
import * as lim from "azure-devops-node-api/interfaces/LocationsInterfaces";

export async function getApi(
  serverUrl: string,
  azureDevOpsToken: string
): Promise<nodeApi.WebApi> {
  const token = azureDevOpsToken;
  const authHandler = nodeApi.getPersonalAccessTokenHandler(token);
  const option = undefined;

  const vsts: nodeApi.WebApi = new nodeApi.WebApi(
    serverUrl,
    authHandler,
    option
  );
  const connData: lim.ConnectionData = await vsts.connect();
  if (connData) {
    if (connData.authenticatedUser) {
      console.log(`Hello ${connData.authenticatedUser.providerDisplayName}`);
    }
  }
  return vsts;
}

export async function getWebApi(
  serverUrl: string,
  azureDevOpsToken: string
): Promise<nodeApi.WebApi> {
  return await getApi(serverUrl, azureDevOpsToken);
}

export async function getExtensionInfo(
  serverUrl: string,
  azureDevOpsToken: string,
  publisherName: string,
  extensionId: string
): Promise<ExtensionManagementInterfaces.InstalledExtension> {
  const webApi: nodeApi.WebApi = await getWebApi(serverUrl, azureDevOpsToken);
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.getInstalledExtensionByName(
    publisherName,
    extensionId
  );
}

export async function uninstallExtension(
  serverUrl: string,
  azureDevOpsToken: string,
  publisherName: string,
  extensionId: string
): Promise<void> {
  const webApi: nodeApi.WebApi = await getWebApi(serverUrl, azureDevOpsToken);
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.uninstallExtensionByName(
    publisherName,
    extensionId
  );
}

export async function installExtension(
  serverUrl: string,
  azureDevOpsToken: string,
  publisherName: string,
  extensionId: string
): Promise<ExtensionManagementInterfaces.InstalledExtension> {
  const webApi: nodeApi.WebApi = await getWebApi(serverUrl, azureDevOpsToken);
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi = await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.installExtensionByName(
    publisherName,
    extensionId
  );
}
