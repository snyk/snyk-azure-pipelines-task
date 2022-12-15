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
import * as ExtensionManagementApi from 'azure-devops-node-api/ExtensionManagementApi';
import * as ExtensionManagementInterfaces from 'azure-devops-node-api/interfaces/ExtensionManagementInterfaces';

export async function getInstalledExtensionInfo(
  webApi: WebApi,
  publisherName: string,
  extensionId: string,
): Promise<ExtensionManagementInterfaces.InstalledExtension> {
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi =
    await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  // Will throw error if already installed
  return extensionManagementApiObject.getInstalledExtensionByName(
    publisherName,
    extensionId,
  );
}

export async function uninstallExtension(
  webApi: WebApi,
  publisherName: string,
  extensionId: string,
): Promise<void> {
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi =
    await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.uninstallExtensionByName(
    publisherName,
    extensionId,
  );
}

export async function installExtension(
  webApi: WebApi,
  publisherName: string,
  extensionId: string,
  version?: string,
): Promise<ExtensionManagementInterfaces.InstalledExtension> {
  const extensionManagementApiObject: ExtensionManagementApi.IExtensionManagementApi =
    await webApi.getExtensionManagementApi();

  // Although this API claims to be "ByName", it actually corresponds to the the `extensionId`. The same weirdness exists when you use the az devops CLI
  return extensionManagementApiObject.installExtensionByName(
    publisherName,
    extensionId,
    version,
  );
}
