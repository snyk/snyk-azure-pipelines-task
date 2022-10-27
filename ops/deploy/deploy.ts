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

const fs = require('fs');
const path = require('path');
import { ChildProcess, exec, ExecException } from 'child_process';

import {
  installExtension,
  uninstallExtension,
} from './lib/azure-devops/extensions';

import {
  Command,
  DeployTarget,
  InputArgs,
  parseInputParameters,
} from './cli-args';
import { getWebApi } from './lib/azure-devops';

function checkVersionsMatch(): boolean {
  const packageJsonFilePath = 'package.json';
  const extensionFilePath = 'vss-extension.json';
  const taskFilePath = 'snykTask/task.json';

  const packageJsonVersion: string = JSON.parse(
    fs.readFileSync(packageJsonFilePath, 'utf8'),
  ).version;
  const versionFromExtensionFile: string = JSON.parse(
    fs.readFileSync(extensionFilePath, 'utf8'),
  ).version;

  const taskFileContents = fs.readFileSync(taskFilePath, 'utf8');
  const taskFileJson = JSON.parse(taskFileContents);
  const versionFromTaskFile = `${taskFileJson.version.Major}.${taskFileJson.version.Minor}.${taskFileJson.version.Patch}`;

  console.log(`packageJsonVersion: ${packageJsonVersion}`);
  console.log(`versionFromExtensionFile: ${versionFromExtensionFile}`);
  console.log(`versionFromTaskFile: ${versionFromTaskFile}`);

  return (
    packageJsonVersion === versionFromExtensionFile &&
    versionFromExtensionFile === versionFromTaskFile
  );
}

export interface ExecCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCommand(
  fullCommand: string,
  workingDirectory: string,
): Promise<ExecCommandResult> {
  return new Promise<ExecCommandResult>((resolve, reject) => {
    const res: ChildProcess = exec(
      fullCommand,
      { cwd: workingDirectory },
      (err: ExecException | null, stdout: string, stderr: string) => {
        if (err) {
          const retValue = {
            exitCode: err.code,
            stdout: stdout,
            stderr: stderr,
          } as ExecCommandResult;
          reject(retValue); // I could also resolve it here and then read the exit code in the calling block
        } else {
          const retValue = {
            exitCode: 0,
            stdout: stdout,
            stderr: stderr,
          } as ExecCommandResult;
          resolve(retValue);
        }
      },
    );
  });
}

export class JsonFileUpdater {
  updates = {};
  filepath: string = '';

  static build() {
    return new JsonFileUpdater();
  }

  setJsonFile(path: string) {
    this.filepath = path;
    return this;
  }

  withUpdates(updatesJsonObj) {
    this.updates = updatesJsonObj;
    return this;
  }

  updateFile() {
    if (Object.keys(this.updates).length > 0) {
      const jsonObj = JSON.parse(fs.readFileSync(this.filepath, 'utf8'));
      Object.keys(this.updates).forEach((k) => (jsonObj[k] = this.updates[k]));
      const jsonStr: string = JSON.stringify(jsonObj, null, 2);
      fs.writeFileSync(this.filepath, jsonStr);
    }
  }
}

export class VSSExtensionOverrideJson {
  overrideJsonObj = {};

  static build(): VSSExtensionOverrideJson {
    const o = new VSSExtensionOverrideJson();
    return o;
  }

  withExtensionId(extensionId: string) {
    this.overrideJsonObj['id'] = extensionId;
    return this;
  }

  withExtensionName(extensionName: string) {
    this.overrideJsonObj['name'] = extensionName;
    return this;
  }

  withPublishPublic(publishPublic: boolean) {
    if (publishPublic) {
      this.overrideJsonObj['public'] = publishPublic;
    }
    return this;
  }

  withVersion(version: string) {
    this.overrideJsonObj['version'] = version;
    return this;
  }

  withExtensionPublisher(publisherName: string) {
    this.overrideJsonObj['publisher'] = publisherName;
    return this;
  }

  getJsonString() {
    return JSON.stringify(this.overrideJsonObj);
  }
}

export const errorIfNewVersionAndTargetNotCustom = (
  target: DeployTarget,
  newVersion?: string,
) => {
  if (newVersion && target !== DeployTarget.Custom) {
    throw new Error('newVersion is only valid for the Custom deploy target');
  }
};

export async function publishExtension(
  target: DeployTarget,
  workingDirectory: string,
  taskRelativePath: string,
  publishArgs: ExtensionPublishArgs,
  newVersion?: string,
): Promise<void> {
  errorIfNewVersionAndTargetNotCustom(target, newVersion);

  // If we want to update task.json, we need to actually update the file - Azure doesn't have the ability to pass in
  // overrides like for it does for vss-extension.json changes.
  const taskFileRelativePath = path.join(taskRelativePath, 'task.json');
  const taskFilePath = path.join(workingDirectory, taskFileRelativePath);
  const taskFileUpdates = {};

  if (publishArgs.taskId) {
    taskFileUpdates['id'] = publishArgs.taskId;
  }
  if (publishArgs.taskName) {
    taskFileUpdates['name'] = publishArgs.taskName;
  }
  if (publishArgs.taskFriendlyName) {
    taskFileUpdates['friendlyName'] = publishArgs.taskFriendlyName;
  }

  if (newVersion) {
    const versionComponents: string[] = newVersion.split('.'); // TODO: extract this and test it and fail if we get invalid input
    const majorV: number = +versionComponents[0]; // the `+` here converts a string to a number
    const minorV: number = +versionComponents[1];
    const patchV: number = +versionComponents[2];

    taskFileUpdates['version'] = {
      Major: majorV,
      Minor: minorV,
      Patch: patchV,
    };
  }

  JsonFileUpdater.build()
    .setJsonFile(taskFilePath)
    .withUpdates(taskFileUpdates)
    .updateFile();

  let overrideJsonBuilder = VSSExtensionOverrideJson.build()
    .withExtensionId(publishArgs.extensionId)
    .withExtensionName(publishArgs.extensionName)
    .withExtensionPublisher(publishArgs.vsMarketplacePublisher)
    .withPublishPublic(target === DeployTarget.Prod);

  if (newVersion) {
    overrideJsonBuilder = overrideJsonBuilder.withVersion(newVersion);
  }

  const overrideJson = overrideJsonBuilder.getJsonString();

  const command = `tfx extension publish --manifest-globs vss-extension.json \
    --extension-id ${publishArgs.extensionId} \
    --publisher ${publishArgs.vsMarketplacePublisher} \
    --token ${publishArgs.azureDevopsPAT} \
    --override '${overrideJson}' \
    --json`;

  const res: ExecCommandResult = await runCommand(command, workingDirectory);

  console.log(res.exitCode);
  console.log(res.stdout);

  if (res.exitCode !== 0) {
    throw Error('Error publishing extension');
  }
}

export const getAzUrl = (azureOrg: string) =>
  `https://dev.azure.com/${azureOrg}/`;

export interface ExtensionPublishArgs {
  extensionId: string;
  extensionName: string;
  taskId: string;
  taskName: string;
  taskFriendlyName: string;
  azureDevopsPAT: string;
  azureOrg: string;
  vsMarketplacePublisher: string;
}

export function getEnvValueOrPanic(envVarName: string) {
  const v = process.env[envVarName];
  if (v) {
    return v;
  } else {
    throw new Error(`Required environment variable not set: ${envVarName}`);
  }
}

function getExtensionPublishArgsFromEnvVars(): ExtensionPublishArgs {
  const extPubArgs: ExtensionPublishArgs = {
    extensionId: getEnvValueOrPanic('EXTENSION_ID'),
    extensionName: getEnvValueOrPanic('EXTENSION_NAME'),
    taskId: getEnvValueOrPanic('TASK_ID'),
    taskName: getEnvValueOrPanic('TASK_NAME'),
    taskFriendlyName: getEnvValueOrPanic('TASK_FRIENDLY_NAME'),
    azureDevopsPAT: getEnvValueOrPanic('AZURE_DEVOPS_EXT_PAT'),
    azureOrg: getEnvValueOrPanic('AZURE_DEVOPS_ORG'),
    vsMarketplacePublisher: getEnvValueOrPanic('VS_MARKETPLACE_PUBLISHER'),
  };
  return extPubArgs;
}

function getExtensionPublishArgsFromConfigFile(
  configFilePath: string,
): ExtensionPublishArgs {
  const configFileJson = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));

  const extPubArgs: ExtensionPublishArgs = {
    extensionId: configFileJson.EXTENSION_ID,
    extensionName: configFileJson.EXTENSION_NAME,
    taskId: configFileJson.TASK_ID,
    taskName: configFileJson.TASK_NAME,
    taskFriendlyName: configFileJson.TASK_FRIENDLY_NAME,
    // azureDevopsPAT: configFileJson.AZURE_DEVOPS_EXT_PAT,
    azureDevopsPAT: getEnvValueOrPanic('AZURE_DEVOPS_EXT_PAT'), // better to not encourage putting tokens in config files
    azureOrg: configFileJson.AZURE_DEVOPS_ORG,
    vsMarketplacePublisher: configFileJson.VS_MARKETPLACE_PUBLISHER,
  };
  return extPubArgs;
}

async function main() {
  const inputArgs: string[] = process.argv.slice(2);
  const cwd = process.cwd();
  mainWithRawArgs(inputArgs, cwd, 'snykTask');
}

export async function mainWithRawArgs(
  inputArgs: string[],
  workingDirectory: string,
  taskRelativePath: string,
) {
  const parsedArgs: InputArgs = parseInputParameters(inputArgs);
  console.log(`parsedArgs:`);
  console.log(` - ${parsedArgs.command}`);
  console.log(` - ${parsedArgs.target}`);
  console.log(` - ${parsedArgs.configFile}`);

  if (parsedArgs.command === Command.VersionCheck) {
    const versionsAllMatch = checkVersionsMatch();
    if (versionsAllMatch) {
      console.log('All versions match... good');
      process.exit(0);
    } else {
      console.log("Versions don't match... bad");
      process.exit(1);
    }
  }

  if (parsedArgs.command === Command.Deploy) {
    let publishArgs: ExtensionPublishArgs;

    // if dev/prod, get args from env vars
    // if config, get install/publish args from config file
    if (
      parsedArgs.target === DeployTarget.Dev ||
      parsedArgs.target === DeployTarget.Prod
    ) {
      publishArgs = getExtensionPublishArgsFromEnvVars();
    } else {
      publishArgs = getExtensionPublishArgsFromConfigFile(
        parsedArgs.configFile,
      );
    }

    await updateOrInstallExtension(
      parsedArgs,
      workingDirectory,
      taskRelativePath,
      publishArgs,
    );
  }
}

export async function updateOrInstallExtension(
  parsedArgs: InputArgs,
  workingDirectory: string,
  taskRelativePath: string,
  publishArgs: ExtensionPublishArgs,
): Promise<void> {
  if (!publishArgs.azureDevopsPAT) {
    console.log('Azure token (AZURE_DEVOPS_EXT_PAT) is not set');
    process.exit(1);
  }

  const azUrl = getAzUrl(publishArgs.azureOrg);
  const webApi = await getWebApi(azUrl, publishArgs.azureDevopsPAT);

  // uninstall previous - this should be an option
  // TODO: add an option like --install-new-version which, when set, will control whether we call uninstallPreviousVersion() / installNewVersion
  await uninstallExtension(
    webApi,
    publishArgs.vsMarketplacePublisher,
    publishArgs.extensionId,
  );

  // publish - shell out to call `tfx extension publish...`
  await publishExtension(
    parsedArgs.target,
    workingDirectory,
    taskRelativePath,
    publishArgs,
    parsedArgs.newVersion,
  );

  // install new version - this should be an option
  await installExtension(
    webApi,
    publishArgs.vsMarketplacePublisher,
    publishArgs.extensionId,
  );
}

if (require.main === module) {
  main();
}

const exported = {
  getExtensionPublishArgsFromEnvVars,
  getExtensionPublishArgsFromConfigFile,
};

export default exported;
