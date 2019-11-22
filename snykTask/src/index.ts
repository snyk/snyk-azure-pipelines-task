import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import { TaskArgs, getAuthToken } from "./task-args";
import * as fs from "fs";
import stream = require("stream");

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
const HTML_REPORT_FILE_NAME = "report.html";
const HTML_ATTACHMENT_TYPE = "HTML_ATTACHMENT_TYPE";

const isDebugMode = () => {
  const taskDebug = true;
  // taskDebug = tl.getBoolInput("debug-task", false);

  return taskDebug;
};

function buildToolRunner(tool: string, requiresSudo: boolean): tr.ToolRunner {
  const toolPath = requiresSudo ? tl.which("sudo") : tl.which(tool);
  let toolRunner = tl.tool(toolPath);

  if (requiresSudo) toolRunner = toolRunner.arg(tool);
  if (isDebugMode()) console.log(`toolPath: ${toolPath}`);

  return toolRunner;
}

function parseInputArgs(): TaskArgs {
  const taskArgs: TaskArgs = new TaskArgs();
  taskArgs.targetFile = tl.getInput("targetFile", false);
  taskArgs.dockerImageName = tl.getInput("dockerImageName", false);
  taskArgs.dockerfilePath = tl.getInput("dockerfilePath", false);
  taskArgs.projectName = tl.getInput("projectName", false);
  taskArgs.organization = tl.getInput("organization", false);
  taskArgs.monitorOnBuild = tl.getBoolInput("monitorOnBuild", true);
  taskArgs.failOnIssues = tl.getBoolInput("failOnIssues", true);
  taskArgs.additionalArguments = tl.getInput("additionalArguments", false);
  taskArgs.testDirectory = tl.getInput("testDirectory", false);
  taskArgs.severityThreshold = tl.getInput("severityThreshold", false);
  if (taskArgs.severityThreshold) {
    taskArgs.severityThreshold = taskArgs.severityThreshold.toLowerCase();
    if (isNotValidThreshold(taskArgs.severityThreshold)) {
      const errorMsg =
        "If set, severity threshold must be 'high' or 'medium' or 'low' (case insensitive). If not set, the default is 'low'.";
      throw new Error(errorMsg);
    }
  }

  if (isDebugMode()) {
    logAllTaskArgs(taskArgs);
  }

  return taskArgs;
}

const isNotValidThreshold = (threshold: string) => {
  const severityThresholdLowerCase = threshold.toLowerCase();

  return (
    severityThresholdLowerCase !== "high" &&
    severityThresholdLowerCase !== "medium" &&
    severityThresholdLowerCase !== "low"
  );
};

const logAllTaskArgs = (taskArgs: TaskArgs) => {
  console.log(`taskArgs.targetFile: ${taskArgs.targetFile}`);
  console.log(`taskArgs.dockerImageName: ${taskArgs.dockerImageName}`);
  console.log(`taskArgs.dockerfilePath: ${taskArgs.dockerfilePath}`);
  console.log(`taskArgs.severityThreshold: ${taskArgs.severityThreshold}`);
  console.log(`taskArgs.projectName: ${taskArgs.projectName}`);
  console.log(`taskArgs.organization: ${taskArgs.organization}`);
  console.log(`taskArgs.monitorOnBuild: ${taskArgs.monitorOnBuild}`);
  console.log(`taskArgs.failOnIssues: ${taskArgs.failOnIssues}`);
  console.log(`taskArgs.additionalArguments: ${taskArgs.additionalArguments}`);
  console.log("\n");
};

async function showDirectoryListing(options: tr.IExecOptions) {
  const lsPath = tl.which("ls");
  console.log(`\nlsPath: ${lsPath}\n`);

  const lsToolRunner: tr.ToolRunner = tl.tool(lsPath);
  lsToolRunner.arg("-la");
  const lsExitCode = await lsToolRunner.exec(options);
  console.log(`lsExitCode: ${lsExitCode}\n`);
}

async function installSnyk(
  options: tr.IExecOptions,
  useSudo: boolean
): Promise<SnykOutput> {
  const installSnykToolRunner: tr.ToolRunner = buildToolRunner("npm", useSudo)
    .arg("install")
    .arg("-g")
    .arg("snyk")
    .arg("snyk-to-html");
  const installSnykExitCode = await installSnykToolRunner.exec(options);
  if (isDebugMode())
    console.log(`installSnykExitCode: ${installSnykExitCode}\n`);
  const snykOutput: SnykOutput = {
    code: installSnykExitCode,
    message: "Not possible install snyk and snky-to-html packages"
  };

  return snykOutput;
}

async function authorizeSnyk(
  snykToken: string,
  options: tr.IExecOptions,
  useSudo: boolean
): Promise<SnykOutput> {
  // TODO: play with setVariable as an option to use instead of running `snyk auth`
  // tl.setVariable('SNYK_TOKEN', authToken, true);
  const snykAuthToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
    .arg("auth")
    .arg(snykToken);
  const snykAuthExitCode = await snykAuthToolRunner.exec(options);
  if (isDebugMode()) console.log(`snykAuthExitCode: ${snykAuthExitCode}\n`);
  const snykOutput: SnykOutput = {
    code: snykAuthExitCode,
    message: "Invalid token - Snyk does not authorized the user"
  };

  return snykOutput;
}

async function runSnykTest(
  taskArgs: TaskArgs,
  options: tr.IExecOptions,
  useSudo: boolean,
  workDir: string
): Promise<SnykOutput> {
  let errorMsg = "";
  let code = 0;
  const fileArg = taskArgs.getFileParameter();
  const snykToHTMLToolRunner: tr.ToolRunner = buildToolRunner(
    "snyk-to-html",
    useSudo
  );
  const snykTestToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
    .arg("test")
    .argIf(
      taskArgs.severityThreshold,
      `--severity-threshold=${taskArgs.severityThreshold}`
    )
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)
    .argIf(taskArgs.additionalArguments, taskArgs.additionalArguments)
    .arg(`--json`)
    .pipeExecOutputToTool(snykToHTMLToolRunner);

  const snykTestExitCode = await snykTestToolRunner.exec(options);
  if (isDebugMode()) console.log(`snykTestExitCode: ${snykTestExitCode}\n`);

  if (snykTestExitCode === CLI_EXIT_CODE_ISSUES_FOUND) {
    code = snykTestExitCode;
    errorMsg = "failing task because `snyk test` found issues";
  }

  if (snykTestExitCode >= CLI_EXIT_CODE_INVALID_USE) {
    code = snykTestExitCode;
    errorMsg =
      "failing task because `snyk test` was improperly used or had other errors";
  }
  const snykOutput: SnykOutput = { code: code, message: errorMsg };

  return snykOutput;
}

async function runSnykMonitor(
  taskArgs: TaskArgs,
  options: tr.IExecOptions,
  useSudo: boolean
): Promise<SnykOutput> {
  let errorMsg = "";
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
  if (isDebugMode())
    console.log(`snykMonitorExitCode: ${snykMonitorExitCode}\n`);

  if (snykMonitorExitCode !== SNYK_MONITOR_EXIT_CODE_SUCCESS) {
    errorMsg = "failing task because `snyk monitor` had an error";

    if (snykMonitorExitCode === SNYK_MONITOR_EXIT_INVALID_FILE_OR_IMAGE)
      errorMsg =
        "failing task because `snyk monitor` had an error - unknown file or image";
  }
  const snykOutput: SnykOutput = {
    code: snykMonitorExitCode,
    message: errorMsg
  };

  return snykOutput;
}

const isSudoMode = (): boolean => {
  const p: tl.Platform = tl.getPlatform();
  if (typeof p !== "number") return true;

  return p === tl.Platform.Linux;
};

const attachReport = (file: string, workDir: string) => {
  if (fs.existsSync(`${workDir}/${file}`)) {
    console.log("file exists... attaching file");
    if (isDebugMode())
      console.log(fs.readFileSync(`${workDir}/${file}`, "utf8"));
    tl.addAttachment(HTML_ATTACHMENT_TYPE, file, `${workDir}/${file}`);
  }
};

const optionsToExecuteSnykTest = (
  workDir: string,
  taskArgs: TaskArgs
): tr.IExecOptions => {
  const jsonFilePath = `${workDir}/${HTML_REPORT_FILE_NAME}`;
  const stream: stream.Writable = fs.createWriteStream(jsonFilePath);

  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
    outStream: stream
  } as tr.IExecOptions;
};

const optionsToExecuteCmd = (taskArgs: TaskArgs): tr.IExecOptions => {
  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true
  } as tr.IExecOptions;
};

async function run() {
  try {
    const currentWorkingDirectory: string = tl.cwd();
    if (isDebugMode())
      console.log(`currentWorkingDirectory: ${currentWorkingDirectory}\n`);

    const taskArgs: TaskArgs = parseInputArgs();
    const authTokenToUse = getAuthToken();
    if (!authTokenToUse) {
      const errorMsg =
        "auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter.";
      throw new SnykError(errorMsg);
    }

    if (isDebugMode()) showDirectoryListing(optionsToExecuteCmd(taskArgs));

    const useSudo = isSudoMode();
    if (isDebugMode()) console.log(`useSudo: ${useSudo}`);

    const installSnykResult = await installSnyk(
      optionsToExecuteCmd(taskArgs),
      useSudo
    );
    if (installSnykResult.code !== CLI_EXIT_CODE_SUCCESS)
      throw new SnykError(installSnykResult.message);

    const authorizeSnykResult = await authorizeSnyk(
      authTokenToUse,
      optionsToExecuteCmd(taskArgs),
      useSudo
    );
    if (authorizeSnykResult.code !== CLI_EXIT_CODE_SUCCESS)
      throw new SnykError(authorizeSnykResult.message);

    let optionsToExeSnykTest = optionsToExecuteCmd(taskArgs);
    if (fs.existsSync(currentWorkingDirectory)) {
      console.log("Set Execute Snyk Test with file out stream");
      optionsToExeSnykTest = optionsToExecuteSnykTest(
        currentWorkingDirectory,
        taskArgs
      );
    }

    const snykTestResult = await runSnykTest(
      taskArgs,
      optionsToExeSnykTest,
      useSudo,
      currentWorkingDirectory
    );
    if (snykTestResult.code >= CLI_EXIT_CODE_INVALID_USE)
      throw new SnykError(snykTestResult.message);
    if (
      snykTestResult.code === CLI_EXIT_CODE_ISSUES_FOUND &&
      taskArgs.failOnIssues
    )
      throw new SnykError(snykTestResult.message);
    if (isDebugMode()) showDirectoryListing(optionsToExecuteCmd(taskArgs));

    attachReport(HTML_REPORT_FILE_NAME, currentWorkingDirectory);

    if (taskArgs.monitorOnBuild) {
      const snykMonitorResult = await runSnykMonitor(
        taskArgs,
        optionsToExecuteCmd(taskArgs),
        useSudo
      );
      if (snykMonitorResult.code !== CLI_EXIT_CODE_SUCCESS)
        throw new SnykError(snykMonitorResult.message);
    }

    tl.setResult(tl.TaskResult.Succeeded, "Snyk Scan completed");
  } catch (err) {
    console.error("\n\n***************************");
    console.error("** We have a problem! :( **");
    console.error("***************************\n");
    console.error(err.message);
    if (isDebugMode()) console.log(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
