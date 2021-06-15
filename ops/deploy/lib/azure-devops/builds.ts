import * as nodeApi from 'azure-devops-node-api';
import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';

export async function getBuildDefinitions(
  webApi: nodeApi.WebApi,
  projectName: string,
) {
  const buildApi = await webApi.getBuildApi();
  const buildDefinitions = await buildApi.getDefinitions(projectName);
  return buildDefinitions;
}

export async function getBuildDefinition(
  webApi: nodeApi.WebApi,
  projectName: string,
  buildDefinitionId: number,
) {
  const buildApi = await webApi.getBuildApi();
  const buildDefinition = await buildApi.getDefinition(
    projectName,
    buildDefinitionId,
  );
  return buildDefinition;
}

export async function getBuilds(
  webApi: nodeApi.WebApi,
  projectName: string,
  buildDefinitionId,
) {
  const buildApi = await webApi.getBuildApi();
  const buildDefinition = await buildApi.getBuilds(projectName, [
    buildDefinitionId,
  ]);
  return buildDefinition;
}

export async function getBuild(
  webApi: nodeApi.WebApi,
  projectName: string,
  buildId: number,
) {
  const buildApi = await webApi.getBuildApi();
  const buildDefinition = await buildApi.getBuild(projectName, buildId);
  return buildDefinition;
}

export async function queueBuild(
  webApi: nodeApi.WebApi,
  projectName: string,
  build: BuildInterfaces.Build,
) {
  const buildApi = await webApi.getBuildApi();
  const queueBuildResult: BuildInterfaces.Build = await buildApi.queueBuild(
    build,
    projectName,
  );
  return queueBuildResult;
}

export async function launchBuildPipeline(
  webApi: nodeApi.WebApi,
  azOrg: string,
  projectName: string,
  buildDefinitionId: number,
) {
  const apiUrl = `https://dev.azure.com/${azOrg}/${projectName}/_apis/build/builds?api-version=5.1`;
  const res = await webApi.rest.create(apiUrl, {
    definition: {
      id: buildDefinitionId,
    },
  });
  return res as any;
}
