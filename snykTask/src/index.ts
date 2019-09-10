import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import { TaskArgs } from "./task-args";

// import { loadPartialConfig } from '@babel/core';

enum InstallMethod {
  NPM,
  NPMWithSudo,
  Binary
}

const CLI_EXIT_CODE_SUCCESS = 0;
const CLI_EXIT_CODE_ISSUES_FOUND = 1;
const CLI_EXIT_CODE_INVALID_USE = 2;


// I can't Mock the getPlatform stuff: https://github.com/microsoft/azure-pipelines-task-lib/issues/530
function chooseInstallMethod(p: tl.Platform): InstallMethod {
  if (p === tl.Platform.Linux) {
    return InstallMethod.NPMWithSudo;
  } else if (p === tl.Platform.Windows) {
    return InstallMethod.NPM;
  } else if (p === tl.Platform.MacOS) {
    return InstallMethod.NPM;
  } else {
    // this is not possible but is required because JavaScript
    return InstallMethod.NPM;
  }
}

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

  taskArgs.targetFile = tl.getInput("target-file", false);
  taskArgs.dockerImageName = tl.getInput("docker-image-name", false);
  taskArgs.dockerfilePath = tl.getInput("dockerfile-path", false);
  taskArgs.severityThreshold = tl.getInput("severity-threshold", false);
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

  taskArgs.projectName = tl.getInput("project-name", false);
  taskArgs.organization = tl.getInput("organization", false);

  taskArgs.monitorOnBuild = tl.getBoolInput("monitor-on-build", true);
  taskArgs.failOnIssues = tl.getBoolInput("fail-on-issues", true);
  taskArgs.additionalArguments = tl.getInput("additional-arguments", false);

  taskArgs.testDirectory = tl.getInput("test-directory", false);

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

async function installSnyk(
  taskArgs: TaskArgs,
  options: tr.IExecOptions,
  useSudo: boolean
) {
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
  fileArg: string,
  useSudo: boolean
): Promise<number> {
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
  fileArg: string,
  useSudo: boolean
) {
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

    // Just used for testing
    const isTest: boolean = tl.getInput("isTest", false) === "true";
    const authToken = tl.getInput("authToken", false);

    const serviceConnectionEndpoint = tl.getInput(
      "service-connection-endpoint",
      false
    );
    console.log(`service-connection-endpoint: ${serviceConnectionEndpoint}\n`);

    // const authTokenToUse = authToken;
    let authTokenToUse = "";

    // very kludgy thing to make the tests work but have it still work in Azure with the service connection
    if (isTest) {
      // use authToken field
      authTokenToUse = authToken;
    } else if (authToken && !serviceConnectionEndpoint) {
      // use authToken field
      console.log(
        "authToken is set and service-connection-endpoint is not... using authToken"
      );
      authTokenToUse = authToken;
    } else {
      // pull token from the service connection and fail if it is not set
      if (serviceConnectionEndpoint) {
        const endpointAuthorization = tl.getEndpointAuthorization(
          serviceConnectionEndpoint,
          false
        );

        if (endpointAuthorization) {
          const authTokenFromServiceConnection =
            endpointAuthorization.parameters["apitoken"];
          authTokenToUse = authTokenFromServiceConnection;
          console.log(
            `authTokenFromServiceConnection: ${authTokenFromServiceConnection}\n`
          );
        }
      }
    }

    const options = {
      cwd: taskArgs.testDirectory,
      failOnStdErr: false,
      ignoreReturnCode: true
    } as tr.IExecOptions;

    if (taskDebug) {
      showDirectoryListing(options);
    }

    let installMethod = InstallMethod.NPMWithSudo;
    if (!isTest) {
      const platform: tl.Platform = tl.getPlatform();
      installMethod = chooseInstallMethod(platform);
    }
    console.log(`installMethod: ${installMethod}\n`);

    const useSudo = installMethod === InstallMethod.NPMWithSudo;
    console.log(`useSudo: ${useSudo}`);

    await installSnyk(taskArgs, options, useSudo);

    await authorizeSnyk(authTokenToUse, options, useSudo);

    const fileArg = taskArgs.getFileParameter();
    const snykTestExitCode = await runSnykTest(
      taskArgs,
      options,
      fileArg,
      useSudo
    );

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
      runSnykMonitor(taskArgs, options, fileArg, useSudo);
    }
  } catch (err) {
    console.log("exception caught!");
    console.log(err.message);
    console.log(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
