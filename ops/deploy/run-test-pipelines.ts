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
import * as fs from 'fs';

import { getAzUrl, getWebApi } from './lib/azure-devops';

import { getBuild, launchBuildPipeline } from './lib/azure-devops/builds';

import {
  BuildStatus,
  BuildResult,
} from 'azure-devops-node-api/interfaces/BuildInterfaces';

interface AzureVars {
  azOrg: string;
  azureDevopsExtPAT: string;
}

function getEnvVars(): AzureVars {
  const azOrg = process.env.DEV_AZ_ORG || '';
  const azToken = process.env.DEV_AZURE_DEVOPS_EXT_PAT || '';

  const vars: AzureVars = {
    azOrg: azOrg,
    azureDevopsExtPAT: azToken,
  };
  return vars;
}

async function main() {
  console.log(`pwd: ${process.cwd()}`);

  const testBuildConfigFileStr = fs.readFileSync(
    './ops/deploy/test-builds.json',
    'utf8',
  );
  const testBuildDefinitions = JSON.parse(testBuildConfigFileStr);

  const azVars = getEnvVars();
  const azUrl = getAzUrl(azVars.azOrg);

  const webApi: WebApi = await getWebApi(azUrl, azVars.azureDevopsExtPAT);

  const allBuilds: Promise<void>[] = [];

  for (const nextTestBuildDefinition of testBuildDefinitions) {
    const testProjectName = nextTestBuildDefinition.projectName;
    const testBuildDefinitionId = nextTestBuildDefinition.buildDefinitionId;

    const buildPromise = runBuild(
      webApi,
      azVars.azOrg,
      testProjectName,
      testBuildDefinitionId,
    );

    allBuilds.push(buildPromise);
  }

  console.log('waiting for all builds to complete');
  try {
    await Promise.all(allBuilds);
    console.log('all builds complete');
  } catch (errAll) {
    console.log('error awaiting all builds');
    console.log(errAll);
    process.exit(1);
  }
}

/**
 *
 * @returns Promise<bool> such that the bool is true if the build ran succesfully without failures and false if it ran but had failures. Should reject the promise on error.
 */
async function runBuild(
  webApi: WebApi,
  azOrg: string,
  testProjectName: string,
  testBuildDefinitionId: number,
): Promise<void> {
  let success = false;

  try {
    const launchPipelineResult = await launchBuildPipeline(
      webApi,
      azOrg,
      testProjectName,
      testBuildDefinitionId,
    );

    const buildId = launchPipelineResult.result.id;

    const alwaysBeTrue = 1 === 1;
    while (alwaysBeTrue) {
      const checkBuildStatusRes = await getBuild(
        webApi,
        testProjectName,
        buildId,
      );

      const status = checkBuildStatusRes.status;

      console.log(`status: ${status}`);
      console.log(`BuildStatus.Completed: ${BuildStatus.Completed}`);

      if (!status) {
        throw new Error('status is not set');
      }

      if (status === BuildStatus.Completed) {
        console.log('build is complete');
        const result = checkBuildStatusRes.result;
        console.log(`build result: ${result}`);
        if (result) {
          if (result === BuildResult.Succeeded) {
            console.log('build succeeded');
            success = true;
          } else {
            console.log(`build did not succeed. BuildResult code: ${result}`);
          }
        }
        break;
      } else {
        console.log(
          `Still waiting for build ${buildId} to complete. Status: ${status}. Time: ${new Date().getTime()}`,
        );
        await asyncSleep(10000);
      }
    }

    if (success) {
      return Promise.resolve();
    } else {
      console.log('resolving false - not successful');
      return Promise.reject();
    }
  } catch (err) {
    console.log('failed to launching / checking build');
    console.log(err);
    console.log('\nrejecting - not successful');
    return Promise.reject();
  }
}

async function asyncSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

if (require.main === module) {
  main();
}
