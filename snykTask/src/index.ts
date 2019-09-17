import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import { TaskArgs, getAuthToken } from "./task-args";

// import { loadPartialConfig } from '@babel/core';

const CLI_EXIT_CODE_SUCCESS = 0;
const CLI_EXIT_CODE_ISSUES_FOUND = 1;
const CLI_EXIT_CODE_INVALID_USE = 2;

function buildToolRunner(tool: string, requiresSudo: boolean): tr.ToolRunner {
  if (requiresSudo) {
    const sudoPath = tl.which("sudo");
    return tl.tool(sudoPath).arg(tool);
  } else {
    const toolPath = tl.which(tool);
    console.log(`toolPath: ${toolPath}`);
    return tl.tool(toolPath);
  }
}

// const parseInput = (parameterName: string, isRequired: boolean) : string => {
//   return tl.getInput(parameterName, isRequired);
// };

// const parseBooleanInput = (parameterName: string, isRequired: boolean) : boolean => {
//   return tl.getBoolInput(parameterName, isRequired);
// };

function parseInputArgs(debug: boolean): TaskArgs {
  const taskArgs: TaskArgs = new TaskArgs();

  taskArgs.targetFile = tl.getInput("targetFile", false);
  taskArgs.dockerImageName = tl.getInput("dockerImageName", false);
  taskArgs.dockerfilePath = tl.getInput("dockerfilePath", false);
  taskArgs.severityThreshold = tl.getInput("severityThreshold", false);
  if (taskArgs.severityThreshold) {
    const severityThresholdLowerCase = taskArgs.severityThreshold.toLowerCase();

    if (
      severityThresholdLowerCase !== "high" &&
      severityThresholdLowerCase !== "medium" &&
      severityThresholdLowerCase !== "low"
    ) {
      tl.setResult(
        tl.TaskResult.Failed,
        "If set, severity threshold must be 'high' or 'medium' or 'low' (case insensitive). If not set, the default is 'low'."
      );
      throw new Error(); // makes the task finish
    } else {
      taskArgs.severityThreshold = severityThresholdLowerCase;
    }
  }

  taskArgs.projectName = tl.getInput("projectName", false);
  taskArgs.organization = tl.getInput("organization", false);

  taskArgs.monitorOnBuild = tl.getBoolInput("monitorOnBuild", true);
  taskArgs.failOnIssues = tl.getBoolInput("failOnIssues", true);
  taskArgs.additionalArguments = tl.getInput("additionalArguments", false);

  taskArgs.testDirectory = tl.getInput("testDirectory", false);

  if (debug) {
    console.log(`taskArgs.targetFile: ${taskArgs.targetFile}`);
    console.log(`taskArgs.dockerImageName: ${taskArgs.dockerImageName}`);
    console.log(`taskArgs.dockerfilePath: ${taskArgs.dockerfilePath}`);
    console.log(`taskArgs.severityThreshold: ${taskArgs.severityThreshold}`);
    console.log(`taskArgs.projectName: ${taskArgs.projectName}`);
    console.log(`taskArgs.organization: ${taskArgs.organization}`);
    console.log(`taskArgs.monitorOnBuild: ${taskArgs.monitorOnBuild}`);
    console.log(`taskArgs.failOnIssues: ${taskArgs.failOnIssues}`);
    console.log(
      `taskArgs.additionalArguments: ${taskArgs.additionalArguments}`
    );
    console.log("\n");
  }

  return taskArgs;
}

async function showDirectoryListing(options: tr.IExecOptions) {
  const lsPath = tl.which("ls");
  console.log(`\nlsPath: ${lsPath}\n`);

  const lsToolRunner: tr.ToolRunner = tl.tool(lsPath);
  lsToolRunner.arg("-la");
  const lsExitCode = await lsToolRunner.exec(options);
  console.log(`lsExitCode: ${lsExitCode}\n`);
}

async function installSnyk(options: tr.IExecOptions, useSudo: boolean) {
  const installSnykToolRunner: tr.ToolRunner = buildToolRunner("npm", useSudo)
    .arg("install")
    .arg("-g")
    .arg("snyk");

  const installSnykExitCode = await installSnykToolRunner.exec(options);
  console.log(`installSnykExitCode: ${installSnykExitCode}\n`);
}

async function authorizeSnyk(
  snykToken: string,
  options: tr.IExecOptions,
  useSudo: boolean
) {
  // TODO: play with setVariable as an option to use instead of running `snyk auth`
  // tl.setVariable('SNYK_TOKEN', authToken, true);

  const snykAuthToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
    .arg("auth")
    .arg(snykToken);

  const snykAuthExitCode = await snykAuthToolRunner.exec(options);
  console.log(`snykAuthExitCode: ${snykAuthExitCode}\n`);
}

async function runSnykTest(
  taskArgs: TaskArgs,
  options: tr.IExecOptions,
  useSudo: boolean
): Promise<number> {
  const fileArg = taskArgs.getFileParameter();
  const snykTestToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
    .arg("test")
    .argIf(
      taskArgs.severityThreshold,
      `--severity-threshold=${taskArgs.severityThreshold}`
    )
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)

    .argIf(taskArgs.additionalArguments, taskArgs.additionalArguments);

  const snykTestExitCode = await snykTestToolRunner.exec(options);
  console.log(`snykTestExitCode: ${snykTestExitCode}\n`);

  return snykTestExitCode;
}

async function runSnykMonitor(
  taskArgs: TaskArgs,
  options: tr.IExecOptions,
  useSudo: boolean
) {
  const fileArg = taskArgs.getFileParameter();
  const snykMonitorToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
    .arg("monitor")
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)
    .argIf(taskArgs.organization, `--org=${taskArgs.organization}`)
    .argIf(taskArgs.projectName, `--project-name=${taskArgs.projectName}`)
    .argIf(taskArgs.additionalArguments, taskArgs.additionalArguments);

  const snykMonitorExitCode = await snykMonitorToolRunner.exec(options);
  console.log(`snykMonitorExitCode: ${snykMonitorExitCode}\n`);
}

async function run() {
  try {
    const taskDebug = true;
    // taskDebug = tl.getBoolInput("debug-task", false);
    const currentWorkingDirectory: string = tl.cwd();
    console.log(`currentWorkingDirectory: ${currentWorkingDirectory}\n`);

    const taskArgs: TaskArgs = parseInputArgs(taskDebug);
    const authTokenToUse = getAuthToken();
    if (!authTokenToUse) {
      console.log(
        "auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter."
      );

      tl.setResult(
        tl.TaskResult.Failed,
        "auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter."
      );
      return;
    }

    const options = {
      cwd: taskArgs.testDirectory,
      failOnStdErr: false,
      ignoreReturnCode: true
    } as tr.IExecOptions;

    if (taskDebug) {
      showDirectoryListing(options);
    }

    let useSudo = true;
    try {
      const p: tl.Platform = tl.getPlatform();
      useSudo = p === tl.Platform.Linux; // we need to use sudo for Linux
    } catch (Error) {
      // this occurs during tests as tl.getPlatform() is not mocked
      // https://github.com/microsoft/azure-pipelines-task-lib/issues/530
      console.log("Warning: Error caught calling tl.getPlatform()");
    }
    console.log(`useSudo: ${useSudo}`);

    await installSnyk(options, useSudo);

    await authorizeSnyk(authTokenToUse, options, useSudo);

    const snykTestExitCode = await runSnykTest(taskArgs, options, useSudo);

    if (
      taskArgs.failOnIssues &&
      snykTestExitCode === CLI_EXIT_CODE_ISSUES_FOUND
    ) {
      tl.setResult(
        tl.TaskResult.Failed,
        "failing task because `snyk test` found issues"
      );
    }

    if (snykTestExitCode >= CLI_EXIT_CODE_INVALID_USE) {
      tl.setResult(
        tl.TaskResult.Failed,
        "failing task because `snyk test` was improperly used or had other errors"
      );
    }

    if (taskArgs.monitorOnBuild && snykTestExitCode === CLI_EXIT_CODE_SUCCESS) {
      runSnykMonitor(taskArgs, options, useSudo);
    }
  } catch (err) {
    console.log("exception caught!");
    console.log(err.message);
    console.log(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
