import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import { TaskArgs, getAuthToken } from "./task-args";
import { getTaskVersion } from "./task-version";
import {
  getOptionsToExecuteCmd,
  getOptionsToExecuteSnykCLICommand,
  getOptionsForSnykToHtml,
  isSudoMode,
  getToolPath,
  sudoExists,
  formatDate,
  attachReport,
  removeRegexFromFile,
  JSON_ATTACHMENT_TYPE,
  HTML_ATTACHMENT_TYPE
} from "./task-lib";
import * as fs from "fs";
import * as path from "path";

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

const taskNameForAnalytics = "AZURE_PIPELINES";
const taskJsonPath = path.join(__dirname, "..", "task.json");
const taskVersion = getTaskVersion(taskJsonPath);

const isDebugMode = () => tl.getBoolInput("debug", false);

if (isDebugMode()) {
  console.log(`taskNameForAnalytics: ${taskNameForAnalytics}`);
}

function buildToolRunner(
  tool: string,
  requiresSudo: boolean = false
): tr.ToolRunner {
  const toolPath: string = getToolPath(tool, tl.which, requiresSudo);
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
  taskArgs.additionalArguments =
    tl.getInput("additionalArguments", false) || "";
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
  taskArgs.ignoreUnknownCA = tl.getBoolInput("ignoreUnknownCA", false);

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
  console.log(`taskArgs.ignoreUnknownCA: ${taskArgs.ignoreUnknownCA}`);
  console.log("\n");
};

async function showDirectoryListing(
  options: tr.IExecOptions,
  dirToShow?: string
) {
  const lsPath = tl.which("ls");
  const lsToolRunner: tr.ToolRunner = tl.tool(lsPath);
  lsToolRunner.arg("-la");
  lsToolRunner.argIf(dirToShow, dirToShow);
  await lsToolRunner.exec(options);
}

async function installSnyk(
  taskArgs: TaskArgs,
  useSudo: boolean
): Promise<SnykOutput> {
  const options = getOptionsToExecuteCmd(taskArgs);
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
    message: "Not possible to install snyk and snyk-to-html packages"
  };

  return snykOutput;
}

async function authorizeSnyk(
  taskArgs: TaskArgs,
  snykToken: string
): Promise<SnykOutput> {
  // TODO: play with setVariable as an option to use instead of running `snyk auth`
  // tl.setVariable('SNYK_TOKEN', authToken, true);
  const options = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    taskVersion
  );
  const snykAuthToolRunner: tr.ToolRunner = buildToolRunner("snyk")
    .arg("auth")
    .arg(snykToken)
    .argIf(taskArgs.ignoreUnknownCA, `--insecure`);
  const snykAuthExitCode = await snykAuthToolRunner.exec(options);
  if (isDebugMode()) console.log(`snykAuthExitCode: ${snykAuthExitCode}\n`);
  const snykOutput: SnykOutput = {
    code: snykAuthExitCode,
    message:
      "Invalid token - Snyk cannot authorize the given token. Make sure you correctly configure a Service Connection of type `Snyk Authentication` at the project level."
  };

  return snykOutput;
}

function printFile(path: string) {
  const data = fs.readFileSync(path, {
    encoding: "utf8",
    flag: "r",
  });
  console.log("--------------------------------------------------");
  console.log("PRINTING FILE!");
  console.log(data);
  console.log("--------------------------------------------------");
}

async function runSnykTest(
  taskArgs: TaskArgs,
  jsonReportOutputPath: string
): Promise<SnykOutput> {
  let errorMsg = "";
  let code = 0;
  const fileArg = taskArgs.getFileParameter();
  const snykTestToolRunner: tr.ToolRunner = buildToolRunner("snyk")
    .arg("test")
    .argIf(
      taskArgs.severityThreshold,
      `--severity-threshold=${taskArgs.severityThreshold}`
    )
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)
    .argIf(taskArgs.ignoreUnknownCA, `--insecure`)
    .arg(`--json-file-output=${jsonReportOutputPath}`)
    .line(taskArgs.additionalArguments);

  const options = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    taskVersion
  );

  const command = `[command]${getToolPath("snyk", tl.which)} snyk test...`;
  console.log(command);
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
  printFile(jsonReportOutputPath);
  removeRegexFromFile(jsonReportOutputPath, regexForRemoveCommandLine, isDebugMode());
  printFile(jsonReportOutputPath);

  return snykOutput;
}

const runSnykToHTML = async (
  taskArgs: TaskArgs,
  jsonReportFullPath: string,
  htmlReportFileFullPath: string
): Promise<SnykOutput> => {
  const optionsToExeSnykToHTML = getOptionsForSnykToHtml(
    htmlReportFileFullPath,
    taskArgs
  );

  let code = 0;
  let errorMsg = "";

  const command = `[command]${getToolPath(
    "snyk-to-html",
    tl.which
  )} -i ${jsonReportFullPath}`;
  console.log(command);

  const snykToHTMLToolRunner: tr.ToolRunner = buildToolRunner("snyk-to-html")
    .arg("-i")
    .arg(jsonReportFullPath);
  const snykToHTMLExitCode = await snykToHTMLToolRunner.exec(
    optionsToExeSnykToHTML
  );
  if (snykToHTMLExitCode >= CLI_EXIT_CODE_INVALID_USE) {
    code = snykToHTMLExitCode;
    errorMsg =
      "failing task because `snyk test` was improperly used or had other errors";
  }
  const snykOutput: SnykOutput = { code: code, message: errorMsg };
  printFile(htmlReportFileFullPath);
  removeRegexFromFile(htmlReportFileFullPath, regexForRemoveCommandLine, isDebugMode());
  printFile(htmlReportFileFullPath);

  return snykOutput;
};

async function runSnykMonitor(taskArgs: TaskArgs): Promise<SnykOutput> {
  let errorMsg = "";
  const fileArg = taskArgs.getFileParameter();
  const options = getOptionsToExecuteSnykCLICommand(
    taskArgs,
    taskNameForAnalytics,
    taskVersion
  );
  const snykMonitorToolRunner: tr.ToolRunner = buildToolRunner("snyk")
    .arg("monitor")
    .argIf(taskArgs.dockerImageName, `--docker`)
    .argIf(taskArgs.dockerImageName, `${taskArgs.dockerImageName}`)
    .argIf(fileArg, `--file=${fileArg}`)
    .argIf(taskArgs.organization, `--org=${taskArgs.organization}`)
    .argIf(taskArgs.projectName, `--project-name=${taskArgs.projectName}`)
    .argIf(taskArgs.ignoreUnknownCA, `--insecure`)
    .line(taskArgs.additionalArguments);

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

const handleSnykTestError = (args, snykTestResult, workDir, fileName) => {
  if (snykTestResult.code >= CLI_EXIT_CODE_INVALID_USE) {
    let errorMsg = snykTestResult.message;
    const filePath = `${workDir}/${fileName}`;
    if (fs.existsSync(filePath)) {
      const snykErrorResponse = fs.readFileSync(filePath, "utf8");
      if (isDebugMode()) console.log(snykErrorResponse);

      const snykErrorJSONResponse = JSON.parse(snykErrorResponse);
      if (!snykErrorJSONResponse["ok"])
        errorMsg = snykErrorJSONResponse["error"];
    }
    throw new SnykError(errorMsg);
  }

  if (snykTestResult.code === CLI_EXIT_CODE_ISSUES_FOUND && args.failOnIssues)
    throw new SnykError(snykTestResult.message);
};

const handleSnykToHTMLError = snykToHTMLResult => {
  if (snykToHTMLResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(snykToHTMLResult.message);
};

const handleSnykMonitorError = snykMonitorResult => {
  if (snykMonitorResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(snykMonitorResult.message);
};

const handleSnykAuthError = authorizeSnykResult => {
  if (authorizeSnykResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(authorizeSnykResult.message);
};

const handleSnykInstallError = installSnykResult => {
  if (installSnykResult.code !== CLI_EXIT_CODE_SUCCESS)
    throw new SnykError(installSnykResult.message);
};

async function run() {
  try {
    const currentDir: string = tl.cwd(); // Azure mock framework will return empty string / undefined
    if (isDebugMode()) console.log(`currentWorkingDirectory: ${currentDir}\n`);

    const reportOutputDir = tl.getVariable("Agent.TempDirectory") || ""; // Azure mock framework will return empty string / undefined
    if (isDebugMode()) console.log(`reportOutputDir: ${reportOutputDir}\n`);

    // Hack for Azure framework mock test
    // The test that use the Azure mock framework rely on knowing the output path and filename of the reports
    // in order to verify proper functioning of the task.
    // But, tl.getVariable() is not mocked and always an empty string (or undefined?) when those tests run. Also, the date/time
    // becomes part of the report filenames.
    // So a hack here to make those task-tests work is to set the 'now' timestamp string to "" for the tests and to use the default
    // directory "" - this way the paths will match those in snykTask/src/__tests__/test-task.ts and snykTask/src/__tests__/_test-mock-config-*.ts.
    // But when the task runs for real in Azure Pipelines, the paths will have a full path and a timestamp in the filenames.

    let jsonReportName = "report.json";
    let htmlReportName = "report.html";
    let jsonReportFullPath = jsonReportName;
    let htmlReportFullPath = htmlReportName;

    if (reportOutputDir) {
      const dNowStr = formatDate(new Date());
      jsonReportName = `report-${dNowStr}.json`;
      htmlReportName = `report-${dNowStr}.html`;
      jsonReportFullPath = path.join(reportOutputDir, jsonReportName);
      htmlReportFullPath = path.join(reportOutputDir, htmlReportName);
    }

    if (isDebugMode()) {
      console.log(`reportOutputDir: ${reportOutputDir}`);
      console.log(`jsonReportName: ${jsonReportName}`);
      console.log(`htmlReportName: ${htmlReportName}`);
      console.log(`jsonReportFullPath: ${jsonReportFullPath}`);
      console.log(`htmlReportFullPath: ${htmlReportFullPath}`);
    }

    const taskArgs: TaskArgs = parseInputArgs();
    const authTokenToUse = getAuthToken();
    if (!authTokenToUse) {
      const errorMsg =
        "auth token is not set. Setup SnykAuth service connection and specify serviceConnectionEndpoint input parameter.";
      throw new SnykError(errorMsg);
    }

    const platform: tl.Platform = tl.getPlatform();
    if (isDebugMode()) console.log(`platform: ${platform}`);

    const sudoMode = isSudoMode(platform);
    if (isDebugMode()) console.log(`sudoMode: ${sudoMode}`);

    let useSudo = false;
    if (sudoMode) {
      const sudoExistOnBuildMachine = sudoExists();
      if (isDebugMode())
        console.log(`sudoExistOnBuildMachine: ${sudoExistOnBuildMachine}`);
      useSudo = sudoExistOnBuildMachine;
    }
    if (isDebugMode()) console.log(`useSudo: ${useSudo}`);

    handleSnykInstallError(await installSnyk(taskArgs, useSudo));
    handleSnykAuthError(await authorizeSnyk(taskArgs, authTokenToUse));

    const snykTestResult = await runSnykTest(taskArgs, jsonReportFullPath);

    const snykToHTMLResult = await runSnykToHTML(
      taskArgs,
      jsonReportFullPath,
      htmlReportFullPath
    );

    handleSnykToHTMLError(snykToHTMLResult);

    if (isDebugMode()) {
      console.log("showing contents of current directory...");
      await showDirectoryListing(getOptionsToExecuteCmd(taskArgs));
      console.log("showing contents of agent temp directory...");
      await showDirectoryListing(
        getOptionsToExecuteCmd(taskArgs),
        reportOutputDir
      );
    }

    attachReport(jsonReportFullPath, JSON_ATTACHMENT_TYPE);
    attachReport(htmlReportFullPath, HTML_ATTACHMENT_TYPE);
    handleSnykTestError(
      taskArgs,
      snykTestResult,
      reportOutputDir,
      jsonReportName
    );

    if (taskArgs.monitorOnBuild) {
      const snykMonitorResult = await runSnykMonitor(taskArgs);
      handleSnykMonitorError(snykMonitorResult);
    }

    tl.setResult(tl.TaskResult.Succeeded, "Snyk Scan completed");
  } catch (err) {
    console.error("\n\n**********************************");
    console.error("** Snyk task will fail pipeline **");
    console.error("**************************************\n");
    console.error(err.message);
    if (isDebugMode()) console.log(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
