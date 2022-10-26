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

import * as nodeApi from 'azure-devops-node-api';
import * as CoreApi from 'azure-devops-node-api/CoreApi';
import { GalleryApi } from 'azure-devops-node-api/GalleryApi';
import * as CoreInterfaces from 'azure-devops-node-api/interfaces/CoreInterfaces';
import * as GalleryInterfaces from 'azure-devops-node-api/interfaces/GalleryInterfaces';
import * as lim from 'azure-devops-node-api/interfaces/LocationsInterfaces';
import { WebApi, getBasicHandler } from 'azure-devops-node-api/WebApi';

export function getAzUrl(azureOrg: string): string {
  return `https://dev.azure.com/${azureOrg}/`;
}

export async function getApi(
  serverUrl: string,
  azureDevOpsToken: string,
): Promise<nodeApi.WebApi> {
  const token = azureDevOpsToken;
  const authHandler = nodeApi.getPersonalAccessTokenHandler(token);
  const option = undefined;

  const vsts: nodeApi.WebApi = new nodeApi.WebApi(
    serverUrl,
    authHandler,
    option,
  );
  const connData: lim.ConnectionData = await vsts.connect();
  if (!connData?.authenticatedUser) {
    console.error('failed to connect');
  }

  return vsts;
}

export async function getWebApi(
  serverUrl: string,
  azureDevOpsToken: string,
): Promise<nodeApi.WebApi> {
  return await getApi(serverUrl, azureDevOpsToken);
}

export async function getProject(webApi: nodeApi.WebApi, projectName: string) {
  const coreApiObject: CoreApi.CoreApi = await webApi.getCoreApi();
  const project: CoreInterfaces.TeamProject = await coreApiObject.getProject(
    projectName,
  );
  console.log(project);
  return project;
}

export async function getProjects(webApi: nodeApi.WebApi) {
  const coreApiObject: CoreApi.CoreApi = await webApi.getCoreApi();
  const projects = await coreApiObject.getProjects();
  console.log(projects);
  return projects;
}

// **********************************************************
// hack / partially from tfs-cli app/exec/extension/default.ts
export async function getGalleryApi(webApi: nodeApi.WebApi, azToken: string) {
  const handler = await getCredentials(azToken);
  return new GalleryApi(webApi.serverUrl, [handler]);
}

export async function getCredentials(azToken) {
  return getBasicHandler('OAuth', azToken);
}
// **********************************************************

export async function getExtensionInfo(
  azToken: string,
  publisherName: string,
  extensionName: string,
) {
  // This is a hack based on some fun with the MS GalleryAPI
  // see how we're not using the usual base API URL which includes the org - this is a generic one (but we still authenticate with our token)
  const webApi = await getApi('https://marketplace.visualstudio.com/', azToken);
  const galleryApi = await getGalleryApi(webApi, azToken);

  const version = undefined;

  // This API is the one used by tfx-cli when you call `tfx extesion show`.
  // See https://github.com/microsoft/tfs-cli/blob/master/app/exec/extension/_lib/publish.ts#L172
  const extensionInfo = await galleryApi.getExtension(
    null,
    publisherName,
    extensionName,
    version,
    GalleryInterfaces.ExtensionQueryFlags.IncludeVersions |
      GalleryInterfaces.ExtensionQueryFlags.IncludeFiles |
      GalleryInterfaces.ExtensionQueryFlags.IncludeCategoryAndTags |
      GalleryInterfaces.ExtensionQueryFlags.IncludeSharedAccounts,
  );
  return extensionInfo;
}

export function getLatestVersion(extensionDetails: any): string | undefined {
  return extensionDetails?.versions[0]?.version;
}
