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

import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';

import { TaskArgs, getAuthToken } from './task-args';
import { getTaskVersion } from './task-version';
import {
  getOptionsToExecuteCmd,
  getOptionsToExecuteSnykCLICommand,
  getOptionsForSnykToHtml,
  formatDate,
  attachReport,
  removeRegexFromFile,
  JSON_ATTACHMENT_TYPE,
  HTML_ATTACHMENT_TYPE,
  doVulnerabilitiesExistForFailureThreshold,
  Severity,
} from './task-lib';
import * as fs from 'fs';
import * as path from 'path';
import { getSnykDownloadInfo, downloadExecutable } from './install';

class SnykError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface SnykOutput {
  code: number;
  message: string;
}

const CLI_EXIT_CODE_SUCCESS = 0;
const CLI_EXIT_CODE_ISSUES_FOUND = 1;
const CLI_EXIT_CODE_INVALID_USE = 2;
const SNYK_MONITOR_EXIT_CODE_SUCCESS = 0;
const SNYK_MONITOR_EXIT_INVALID_FILE_OR_IMAGE = 2;
const regexForRemoveCommandLine = /\[command\].*/g;

const taskNameForAnalytics = 'AZURE_PIPELINES';
const taskJsonPath = path.join(__dirname, '..', 'task.json');
const taskVersion = getTaskVersion(taskJsonPath);

const isDebugMode = () => tl.getBoolInput('debug', false);

if (isDebugMode()) {
  console.log(`taskNameForAnalytics: ${taskNameForAnalytics}`);
}

async function sleep(seconds: number): Promise<void> {
  const ms = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseInputArgs(): TaskArgs {
  const taskArgs: TaskArgs = new TaskArgs({
    failOnIssues: tl.getBoolInput('failOnIssues', true),
  });

  taskArgs.targetFile = tl.getInput('targetFile', false);
  taskArgs.dockerImageName = tl.getInput('dockerImageName', false);
  taskArgs.dockerfilePath = tl.getInput('dockerfilePath', false);
  taskArgs.projectName = tl.getInput('projectName', false);
  taskArgs.organization = tl.getInput('organization', false);
  taskArgs.setMonitorWhen(tl.getInput('monitorWhen', false));

  const delayStr = tl.getInput('delayAfterReportGenerationSeconds', false);
  if (delayStr) {
    taskArgs.delayAfterReportGenerationSeconds = parseInt(delayStr);
  }

  taskArgs.additionalArguments =
    tl.getInput('additionalArguments', false) || '';
  taskArgs.testDirectory = tl.getInput('testDirectory', false);
  taskArgs.severityThreshold = tl.getInput('severityThreshold', false);
  taskArgs.failOnThreshold =
    tl.getInput('failOnThreshold', false) || Severity.LOW;
  taskArgs.ignoreUnknownCA = tl.getBoolInput('ignoreUnknownCA', false);

  if (isDebugMode()) {
    logAllTaskArgs(taskArgs);
  }

  taskArgs.validate();

  return taskArgs;
}

const logAllTaskArgs = (taskArgs: TaskArgs) => {
  console.log(`taskArgs.targetFile: ${taskArgs.targetFile}`);
  console.log(`taskArgs.dockerImageName: ${taskArgs.dockerImageName}`);
  console.log(`taskArgs.dockerfilePath: ${taskArgs.dockerfilePath}`);
  console.log(`taskArgs.severityThreshold: ${taskArgs.severityThreshold}`);
  console.log(`taskArgs.failOnThreshold: ${taskArgs.failOnThreshold}`);
  console.log(`taskArgs.projectName: ${taskArgs.projectName}`);
  console.log(`taskArgs.organization: ${taskArgs.organization}`);
  console.log(`taskArgs.monitorWhen: ${taskArgs.monitorWhen}`);
  console.log(`taskArgs.failOnIssues: ${taskArgs.failOnIssues}`);
  console.log(`taskArgs.additionalArguments: ${taskArgs.additionalArguments}`);
  console.log(`taskArgs.ignoreUnknownCA: ${taskArgs.ignoreUnknownCA}`);
  console.log('\n');
};

async function showDirectoryListing(
  options: tr.IExecOptions,
  dirToShow?: string,
) {
  const lsPath = tl.which('ls');
  const lsToolRunner: tr.ToolRunner = tl.tool(lsPath);
  lsToolRunner.arg('-la');
  lsToolRunner.argIf(dirToShow, dirToShow);
  await lsToolRunner.exec(options);
}

async function runSnykTest(
  snykPath: string,
  taskArgs: TaskArgs,
  jsonReportOutputPath: string,
  snykToken: string,
): Promise<SnykOutput> {
  let errorMsg = '';
  let code = 0;
  const fileArg = taskArgs.getFileParameter();
  const projectNameArg = taskArgs.getProjectNameParameter();

  const snykTestToolRunner = tl
    .tool(snykPath)
    .arg('test')
    .argIf(
      taskArgs.severityThreshold,
      `--severity-threshold=${taskArgs.severityThreshold}`,
    )
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)
    .argIf(taskArgs.ignoreUnknownCA, `--insecure`)
    .argIf(taskArgs.organization, `--org=${taskArgs.organization}`)
    .argIf(taskArgs.projectName, `--project-name=${projectNameArg}`)
    .arg(`--json-file-output=${jsonReportOutputPath}`)
    .line(taskArgs.additionalArguments);

  const options = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    taskVersion,
    snykToken,
  );

  const snykTestExitCode = await snykTestToolRunner.exec(options);
  if (isDebugMode()) console.log(`snykTestExitCode: ${snykTestExitCode}\n`);

  if (snykTestExitCode === CLI_EXIT_CODE_ISSUES_FOUND) {
    code = snykTestExitCode;
    errorMsg = 'failing task because `snyk test` found issues';
  }

  if (snykTestExitCode >= CLI_EXIT_CODE_INVALID_USE) {
    code = snykTestExitCode;
    errorMsg =
      'failing task because `snyk test` was improperly used or had other errors';
  }
  const snykOutput: SnykOutput = { code: code, message: errorMsg };
  removeRegexFromFile(
    jsonReportOutputPath,
    regexForRemoveCommandLine,
    isDebugMode(),
  );

  return snykOutput;
}

const runSnykToHTML = async (
  snykToHtmlPath: string,
  taskArgs: TaskArgs,
  jsonReportFullPath: string,
  htmlReportFileFullPath: string,
): Promise<SnykOutput> => {
  const optionsToExeSnykToHTML = getOptionsForSnykToHtml(
    htmlReportFileFullPath,
    taskArgs,
  );

  let code = 0;
  let errorMsg = '';

  const snykToHTMLToolRunner = tl
    .tool(snykToHtmlPath)
    .arg('-i')
    .arg(jsonReportFullPath);
  const snykToHTMLExitCode = await snykToHTMLToolRunner.exec(
    optionsToExeSnykToHTML,
  );
  if (snykToHTMLExitCode >= CLI_EXIT_CODE_INVALID_USE) {
    code = snykToHTMLExitCode;
    errorMsg =
      'failing task because `snyk test` was improperly used or had other errors';
  }
  const snykOutput: SnykOutput = { code: code, message: errorMsg };
  removeRegexFromFile(
    htmlReportFileFullPath,
    regexForRemoveCommandLine,
    isDebugMode(),
  );

  return snykOutput;
};

async function runSnykMonitor(
  snykPath: string,
  taskArgs: TaskArgs,
  snykToken,
): Promise<SnykOutput> {
  let errorMsg = '';
  const fileArg = taskArgs.getFileParameter();
  const projectNameArg = taskArgs.getProjectNameParameter();
  const options = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    taskVersion,
    snykToken,
  );
  const snykMonitorToolRunner = tl
    .tool(snykPath)
    .arg('monitor')
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)
    .argIf(taskArgs.organization, `--org=${taskArgs.organization}`)
    .argIf(taskArgs.projectName, `--project-name=${projectNameArg}`)
    .argIf(taskArgs.ignoreUnknownCA, `--insecure`)
    .line(taskArgs.additionalArguments);

  const snykMonitorExitCode = await snykMonitorToolRunner.exec(options);

  if (isDebugMode())
    console.log(`snykMonitorExitCode: ${snykMonitorExitCode}\n`);

  if (snykMonitorExitCode !== SNYK_MONITOR_EXIT_CODE_SUCCESS) {
    errorMsg = 'failing task because `snyk monitor` had an error';

    if (snykMonitorExitCode === SNYK_MONITOR_EXIT_INVALID_FILE_OR_IMAGE)
      errorMsg =
        'failing task because `snyk monitor` had an error - unknown file or image';
  }
  const snykOutput: SnykOutput = {
    code: snykMonitorExitCode,
    message: errorMsg,
  };

  return snykOutput;
}

const handleSnykTestError = (
  args: TaskArgs,
  snykTestResult: SnykOutput,
  jsonReportFullPath: string,
) => {
  if (snykTestResult.code >= CLI_EXIT_CODE_INVALID_USE) {
    let errorMsg = snykTestResult.message;
    if (fs.existsSync(jsonReportFullPath)) {
      const snykErrorResponse = fs.readFileSync(jsonReportFullPath, 'utf8');
      if (isDebugMode()) console.log(snykErrorResponse);

      const snykErrorJSONResponse = JSON.parse(snykErrorResponse);
      if (!snykErrorJSONResponse['ok'])
        errorMsg = snykErrorJSONResponse['error'];
    }
    throw new SnykError(errorMsg);
  }
};

const handleSnykToHTMLError = (snykToHTMLResult: SnykOutput) => {
  if (snykToHTMLResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(snykToHTMLResult.message);
};

const handleSnykMonitorError = (snykMonitorResult: SnykOutput) => {
  if (snykMonitorResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(snykMonitorResult.message);
};

async function run() {
  try {
    const currentDir: string = tl.cwd(); // Azure mock framework will return empty string / undefined
    if (isDebugMode()) console.log(`currentWorkingDirectory: ${currentDir}\n`);

    const agentTempDirectory = tl.getVariable('Agent.TempDirectory');
    if (!agentTempDirectory) {
      throw new Error('Agent.TempDirectory is not set'); // should always be set by Azure Pipelines environment
    }

    const dNowStr = formatDate(new Date());
    const jsonReportFullPath = path.join(
      agentTempDirectory,
      `report-${dNowStr}.json`,
    );
    const htmlReportFullPath = path.join(
      agentTempDirectory,
      `report-${dNowStr}.html`,
    );

    if (isDebugMode()) {
      console.log(`agentTempDirectory: ${agentTempDirectory}`);
      console.log(`jsonReportFullPath: ${jsonReportFullPath}`);
      console.log(`htmlReportFullPath: ${htmlReportFullPath}`);
    }

    const taskArgs: TaskArgs = parseInputArgs();
    const snykToken = getAuthToken();
    if (!snykToken) {
      const errorMsg =
        'auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter.';
      throw new SnykError(errorMsg);
    }

    const platform: tl.Platform = tl.getPlatform();
    if (isDebugMode()) console.log(`platform: ${platform}`);

    const snykToolDownloads = getSnykDownloadInfo(platform);
    await downloadExecutable(agentTempDirectory, snykToolDownloads.snyk);
    await downloadExecutable(agentTempDirectory, snykToolDownloads.snykToHtml);
    const snykPath = path.resolve(
      agentTempDirectory,
      snykToolDownloads.snyk.filename,
    );
    const snykToHtmlPath = path.resolve(
      agentTempDirectory,
      snykToolDownloads.snykToHtml.filename,
    );

    if (isDebugMode()) {
      console.log('snykPath: ' + snykPath);
      console.log('snykToHtmlPath: ' + snykToHtmlPath);
      console.log('showing contents of agent temp directory...');
      await showDirectoryListing(
        getOptionsToExecuteCmd(taskArgs),
        agentTempDirectory,
      );
    }

    const snykTestResult = await runSnykTest(
      snykPath,
      taskArgs,
      jsonReportFullPath,
      snykToken,
    );

    if (taskArgs.delayAfterReportGenerationSeconds > 0) {
      console.log(
        `sleeping for ${
          taskArgs.delayAfterReportGenerationSeconds
        } after generating JSON report at ${new Date().getTime()}`,
      );
      await sleep(taskArgs.delayAfterReportGenerationSeconds);
      console.log(`done sleeping at at ${new Date().getTime()}`);
    }

    const snykToHTMLResult = await runSnykToHTML(
      snykToHtmlPath,
      taskArgs,
      jsonReportFullPath,
      htmlReportFullPath,
    );

    handleSnykToHTMLError(snykToHTMLResult);

    if (taskArgs.delayAfterReportGenerationSeconds > 0) {
      console.log(
        `sleeping for ${
          taskArgs.delayAfterReportGenerationSeconds
        } after generating HTML report at ${new Date().getTime()}`,
      );
      await sleep(taskArgs.delayAfterReportGenerationSeconds);
      console.log(`done sleeping at at ${new Date().getTime()}`);
    }

    if (isDebugMode()) {
      console.log('showing contents of current directory...');
      await showDirectoryListing(getOptionsToExecuteCmd(taskArgs));
      console.log('showing contents of agent temp directory...');
      await showDirectoryListing(
        getOptionsToExecuteCmd(taskArgs),
        agentTempDirectory,
      );
    }

    attachReport(jsonReportFullPath, JSON_ATTACHMENT_TYPE);
    attachReport(htmlReportFullPath, HTML_ATTACHMENT_TYPE);
    handleSnykTestError(taskArgs, snykTestResult, jsonReportFullPath);

    const snykTestSuccessAndNoIssuesFound = snykTestResult.code === 0;
    if (taskArgs.shouldRunMonitor(snykTestSuccessAndNoIssuesFound)) {
      const snykMonitorResult = await runSnykMonitor(
        snykPath,
        taskArgs,
        snykToken,
      );
      handleSnykMonitorError(snykMonitorResult);
    }

    if (
      snykTestResult.code === CLI_EXIT_CODE_ISSUES_FOUND &&
      taskArgs.failOnIssues
    ) {
      const failureThreshold: string = taskArgs.failOnThreshold;
      const matchingVulnerabilitiesFound =
        doVulnerabilitiesExistForFailureThreshold(
          jsonReportFullPath,
          failureThreshold,
        );
      if (matchingVulnerabilitiesFound) {
        throw new SnykError(snykTestResult.message);
      }
    }

    tl.setResult(tl.TaskResult.Succeeded, 'Snyk Scan completed');
  } catch (err) {
    console.error('\n\n**********************************');
    console.error('** Snyk task will fail pipeline **');
    console.error('**************************************\n');
    console.error(err.message);
    if (isDebugMode()) console.log(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
