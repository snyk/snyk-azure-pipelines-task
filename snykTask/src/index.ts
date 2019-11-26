import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import { TaskArgs, getAuthToken } from "./task-args";
import * as fs from "fs";
import stream = require("stream");
const replace = require("replace-in-file");

class SnykError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface ISnykOutput {
  code: number;
  message: string;
}

const CLI_EXIT_CODE_SUCCESS = 0;
const CLI_EXIT_CODE_ISSUES_FOUND = 1;
const CLI_EXIT_CODE_INVALID_USE = 2;
const SNYK_MONITOR_EXIT_CODE_SUCCESS = 0;
const SNYK_MONITOR_EXIT_INVALID_FILE_OR_IMAGE = 2;
const JSON_REPORT_FILE_NAME = "report.json";
const HTML_REPORT_FILE_NAME = "report.html";
const HTML_ATTACHMENT_TYPE = "HTML_ATTACHMENT_TYPE";
const regexForRunSnykTest = /\[command\]\/usr\/bin\/sudo snyk test --severity-threshold=low --json/g;
const regexForRunSnykToHTML = /\[command\]\/bin\/cat \/home\/vsts\/work\/1\/s\/report\.json \| \/usr\/bin\/sudo snyk-to-html/g;

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
  taskArgs: TaskArgs,
  useSudo: boolean
): Promise<ISnykOutput> {
  const options = getOptionsToExecuteCmd(taskArgs);
  const installSnykToolRunner: tr.ToolRunner = buildToolRunner("npm", useSudo)
    .arg("install")
    .arg("-g")
    .arg("snyk")
    .arg("snyk-to-html");
  const installSnykExitCode = await installSnykToolRunner.exec(options);
  if (isDebugMode())
    console.log(`installSnykExitCode: ${installSnykExitCode}\n`);
  const snykOutput: ISnykOutput = {
    code: installSnykExitCode,
    message: "Not possible install snyk and snky-to-html packages"
  };

  return snykOutput;
}

async function authorizeSnyk(
  taskArgs: TaskArgs,
  snykToken: string,
  useSudo: boolean
): Promise<ISnykOutput> {
  // TODO: play with setVariable as an option to use instead of running `snyk auth`
  // tl.setVariable('SNYK_TOKEN', authToken, true);
  const options = getOptionsToExecuteCmd(taskArgs);
  const snykAuthToolRunner: tr.ToolRunner = buildToolRunner("snyk", useSudo)
    .arg("auth")
    .arg(snykToken);
  const snykAuthExitCode = await snykAuthToolRunner.exec(options);
  if (isDebugMode()) console.log(`snykAuthExitCode: ${snykAuthExitCode}\n`);
  const snykOutput: ISnykOutput = {
    code: snykAuthExitCode,
    message: "Invalid token - Snyk does not authorized the user"
  };

  return snykOutput;
}

async function runSnykTest(
  taskArgs: TaskArgs,
  useSudo: boolean,
  workDir: string
): Promise<ISnykOutput> {
  let errorMsg = "";
  let code = 0;
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
    .argIf(taskArgs.additionalArguments, taskArgs.additionalArguments)
    .arg(`--json`);

    let options = getOptionsToExecuteCmd(taskArgs);
    if (fs.existsSync(workDir)) {
      console.log("Set Execute Snyk Test with file out stream");
      options = getOptionsToWriteFile(JSON_REPORT_FILE_NAME, workDir, taskArgs);
    }

  console.log("[command]/usr/bin/sudo snyk test (args) --json");
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
  const snykOutput: ISnykOutput = { code: code, message: errorMsg };
  await removeFirstLineFrom(workDir, JSON_REPORT_FILE_NAME, regexForRunSnykTest);

  return snykOutput;
}

const runSnykToHTML= async (taskArgs: TaskArgs, workDir: string, useSudo: boolean) => {
  let optionsToExeSnykToHTML = getOptionsToExecuteCmd(taskArgs);
  if (fs.existsSync(workDir)) {
    console.log("Set Execute Snyk-To-HTML with file out stream");
    optionsToExeSnykToHTML = getOptionsToWriteFile(HTML_REPORT_FILE_NAME, workDir, taskArgs);
  }
  console.log("[command]null null/report.json | /usr/bin/sudo snyk-to-html");
  const snykToHTMLToolRunner: tr.ToolRunner = buildToolRunner("snyk-to-html", useSudo)
  const catTRunner: tr.ToolRunner = buildToolRunner("cat", false)
    .arg(`${workDir}/${JSON_REPORT_FILE_NAME}`)
    .pipeExecOutputToTool(snykToHTMLToolRunner);

  await catTRunner.exec(optionsToExeSnykToHTML);
  await removeFirstLineFrom(workDir, HTML_REPORT_FILE_NAME, regexForRunSnykToHTML);
}

async function runSnykMonitor(
  taskArgs: TaskArgs,
  useSudo: boolean
): Promise<ISnykOutput> {
  let errorMsg = "";
  const fileArg = taskArgs.getFileParameter();
  const options = getOptionsToExecuteCmd(taskArgs);
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
  const snykOutput: ISnykOutput = {
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
    console.log(`${file} file exists... attaching file`);
    tl.addAttachment(HTML_ATTACHMENT_TYPE, file, `${workDir}/${file}`);
  }
};

const getOptionsToWriteFile = (
  file: string,
  workDir: string,
  taskArgs: TaskArgs
): tr.IExecOptions => {
  const jsonFilePath = `${workDir}/${file}`;
  const stream: stream.Writable = fs.createWriteStream(jsonFilePath);

  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
    outStream: stream
  } as tr.IExecOptions;
};

const getOptionsToExecuteCmd = (taskArgs: TaskArgs): tr.IExecOptions => {
  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true
  } as tr.IExecOptions;
};

async function removeFirstLineFrom(workDir: string, file: string, regex) {
  if (fs.existsSync(`${workDir}/${file}`)) {
    const options = {
      files: `${workDir}/${file}`,
      from: regex,
      to: ""
    };
    console.log(`Removing first line from ${file}`);
    await replace(options);
    // if (isDebugMode())
    //   console.log(fs.readFileSync(`${workDir}/${file}`, "utf8"));
  }
}

const handleSnykTestError = (args, snykTestResult) => {
  if (snykTestResult.code >= CLI_EXIT_CODE_INVALID_USE)
    throw new SnykError(snykTestResult.message);
  if (
    snykTestResult.code === CLI_EXIT_CODE_ISSUES_FOUND &&
    args.failOnIssues
  )
    throw new SnykError(snykTestResult.message);
};

const handleSnykMonitorError = (snykMonitorResult) => {
  if (snykMonitorResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(snykMonitorResult.message);
};

const handleSnykAuthError = (authorizeSnykResult) => {
  if (authorizeSnykResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(authorizeSnykResult.message);
};

const handleSnykInstallError = (installSnykResult) => {
  if (installSnykResult.code !== CLI_EXIT_CODE_SUCCESS)
      throw new SnykError(installSnykResult.message);
};

async function run() {
  try {
    const currentDir: string = tl.cwd();
    if (isDebugMode())
      console.log(`currentWorkingDirectory: ${currentDir}\n`);

    const taskArgs: TaskArgs = parseInputArgs();
    const authTokenToUse = getAuthToken();
    if (!authTokenToUse) {
      const errorMsg =
        "auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter.";
      throw new SnykError(errorMsg);
    }

    if (isDebugMode()) showDirectoryListing(getOptionsToExecuteCmd(taskArgs));
    const useSudo = isSudoMode();
    if (isDebugMode()) console.log(`useSudo: ${useSudo}`);
    handleSnykInstallError(await installSnyk(taskArgs, useSudo));
    handleSnykAuthError(await authorizeSnyk(taskArgs, authTokenToUse, useSudo));

    const snykTestResult = await runSnykTest(taskArgs, useSudo, currentDir);
    await runSnykToHTML(taskArgs, currentDir, useSudo);
    if (isDebugMode()) showDirectoryListing(getOptionsToExecuteCmd(taskArgs));
    attachReport(HTML_REPORT_FILE_NAME, currentDir);
    handleSnykTestError(taskArgs, snykTestResult);
    
    if (taskArgs.monitorOnBuild) {
      const snykMonitorResult = await runSnykMonitor(taskArgs, useSudo);
      handleSnykMonitorError(snykMonitorResult);
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
